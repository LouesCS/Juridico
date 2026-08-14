import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { MAIL_PORT, MailPort } from '../../../../shared/infrastructure/mail/mail.port';
import { PasswordService } from '../../../../shared/infrastructure/security/password.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';
import { RegisterDto } from '../../presentation/schemas/identity.schemas';
import { provisionLegalFolderDefaults } from '../../../legal-folders/application/legal-folder-defaults';

export interface RegisterOutput {
  usuario: { id: string; nome: string; email: string };
  escritorio: { id: string; slug: string; nomeFantasia: string };
}

/**
 * Reafirma docs/database/12-eventos-fluxos-regras.md §12.3.1: cria
 * Usuario (PENDENTE) + Escritorio (TRIAL) + Membro (OWNER, ATIVO) em uma
 * única transação. Bootstrap intencional: nenhuma dessas três operações
 * exige TenantContext prévio (não existe sessão ainda) — a criação do
 * Membro passa `escritorioId` explicitamente, ver
 * shared/infrastructure/database/tenant-scoped.extension.ts.
 *
 * Decisão de escopo desta etapa: por não depender do módulo Memberships
 * (regra de dependência de docs/backend/04-dependencias.md — Identity não
 * importa Memberships), a resolução do papel de sistema OWNER acontece
 * aqui via leitura direta de `Papel` (que não é tenant-scoped quando
 * `ehSistema=true`), sem acoplar aos use cases internos de Memberships.
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async execute(input: RegisterDto): Promise<Result<RegisterOutput>> {
    const existente = await this.usuarioRepository.buscarPorEmail(input.email);
    if (existente) {
      return Result.fail(new DomainError('EMAIL_ALREADY_EXISTS', 'Este e-mail já está em uso.'));
    }

    const senhaHash = await this.passwordService.hash(input.senha);
    const slug = await this.gerarSlugUnico(input.nomeEscritorio);

    const papelOwner = await this.prisma.client.papel.findFirst({
      where: { nome: 'OWNER', ehSistema: true },
    });
    if (!papelOwner) {
      throw new Error(
        'Papel de sistema OWNER não encontrado — rode o seed (prisma/seed.ts) antes de registrar um escritório.',
      );
    }

    const { usuario, escritorio } = await this.prisma.runBootstrapTransaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: input.nome,
          sobrenome: input.sobrenome,
          email: input.email,
          senhaHash,
          status: 'PENDENTE',
        },
      });

      const escritorio = await tx.escritorio.create({
        data: {
          nomeFantasia: input.nomeEscritorio,
          slug,
          email: input.email,
          status: 'TRIAL',
          plano: 'TRIAL',
        },
      });

      await tx.membro.create({
        data: {
          usuarioId: usuario.id,
          escritorioId: escritorio.id,
          papelId: papelOwner.id,
          status: 'ATIVO',
          // `nome`/`email` passam a ser obrigatórios em `Membro` desde o
          // módulo Colaboradores (fonte canônica de identidade do
          // colaborador, independente de haver conta de acesso) — para o
          // OWNER fundador, espelham o `Usuario` recém-criado.
          nome: `${usuario.nome} ${usuario.sobrenome}`.trim(),
          email: usuario.email,
        },
      });

      await provisionLegalFolderDefaults(tx, escritorio.id);

      return { usuario, escritorio };
    });

    await this.mail.send({
      to: usuario.email,
      template: 'email-verification',
      variables: { nome: usuario.nome, token: randomUUID() },
    });

    return Result.ok({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      escritorio: {
        id: escritorio.id,
        slug: escritorio.slug,
        nomeFantasia: escritorio.nomeFantasia,
      },
    });
  }

  private async gerarSlugUnico(nome: string): Promise<string> {
    const base = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let candidato = base || 'escritorio';
    let sufixo = 0;
    // Poucas colisões esperadas — laço simples e seguro o bastante para o volume da Fase 1.
    while (await this.prisma.client.escritorio.findFirst({ where: { slug: candidato } })) {
      sufixo += 1;
      candidato = `${base}-${sufixo}`;
    }
    return candidato;
  }
}
