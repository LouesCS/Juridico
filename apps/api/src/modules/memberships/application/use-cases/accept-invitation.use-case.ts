import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { PasswordService } from '../../../../shared/infrastructure/security/password.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AcceptInvitationDto } from '../../presentation/schemas/membership.schemas';

/**
 * Reafirma docs/database/12-eventos-fluxos-regras.md §12.3.2 e §12.5
 * ("convite aceito duas vezes") — idempotente via `status` como guarda:
 * segunda tentativa encontra status != PENDENTE e retorna sucesso sem criar
 * segundo Membro.
 */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(token: string, input: AcceptInvitationDto): Promise<Result<{ membroId: string }>> {
    // Fluxo de bootstrap: aceite de convite não tem (nem pode ter)
    // TenantContext prévio — a autorização vem da posse do token de uso
    // único, não de uma sessão de tenant já ativa. Reafirma
    // docs/backend-implementation/19-decisions.md.
    const bootstrap = this.prisma.bootstrapClientSemFiltroDeTenant;
    const tokenHash = hashToken(token);
    const convite = await bootstrap.convite.findFirst({ where: { tokenHash } });

    if (!convite) {
      return Result.fail(new DomainError('NOT_FOUND', 'Convite não encontrado.'));
    }
    if (convite.status === 'ACEITO') {
      // Idempotente — reafirma docs/database/12-eventos-fluxos-regras.md §12.5.
      const membroExistente = await bootstrap.membro.findFirst({
        where: { escritorioId: convite.escritorioId, usuarioId: convite.aceitoPorId ?? undefined },
      });
      return Result.ok({ membroId: membroExistente?.id ?? '' });
    }
    if (convite.status !== 'PENDENTE' || convite.expiraEm < new Date()) {
      return Result.fail(new DomainError('NOT_FOUND', 'Convite inválido ou expirado.'));
    }

    let usuario = await bootstrap.usuario.findFirst({ where: { email: convite.email } });

    if (!usuario) {
      if (!input.nome || !input.sobrenome || !input.senha) {
        return Result.fail(
          new DomainError(
            'MALFORMED_REQUEST',
            'Informe nome, sobrenome e senha para criar sua conta.',
          ),
        );
      }
      const senhaHash = await this.passwordService.hash(input.senha);
      usuario = await bootstrap.usuario.create({
        data: {
          nome: input.nome,
          sobrenome: input.sobrenome,
          email: convite.email,
          senhaHash,
          status: 'ATIVO',
          emailVerificadoEm: new Date(),
        },
      });
    }

    const usuarioId = usuario.id;
    const { membro } = await this.prisma.runBootstrapTransaction(async (tx) => {
      let membro;
      if (convite.membroId) {
        // Módulo Colaboradores: convite emitido para CONCEDER ACESSO a um
        // `Membro` (colaborador) já cadastrado sem conta — atualiza o
        // registro existente em vez de criar um segundo `Membro` para a
        // mesma pessoa. `nome`/`email`/demais dados de perfil já estão
        // preenchidos desde o cadastro do colaborador; não são
        // sobrescritos aqui.
        membro = await tx.membro.update({
          where: { id: convite.membroId },
          data: {
            usuarioId,
            status: 'ATIVO',
            convidadoPorId: convite.convidadoPorId,
            dataAceiteConvite: new Date(),
          },
        });
      } else {
        // Fluxo tradicional de convite direto (sem colaborador
        // pré-existente) — cria o `Membro` do zero, espelhando `nome`/
        // `email` do `Usuario` recém-criado/reaproveitado (fonte canônica
        // de identidade do colaborador desde o módulo Colaboradores).
        membro = await tx.membro.create({
          data: {
            usuarioId,
            escritorioId: convite.escritorioId,
            papelId: convite.papelId,
            status: 'ATIVO',
            convidadoPorId: convite.convidadoPorId,
            dataAceiteConvite: new Date(),
            nome: `${usuario.nome} ${usuario.sobrenome}`.trim(),
            email: usuario.email,
          },
        });
      }
      await tx.convite.update({
        where: { id: convite.id },
        data: { status: 'ACEITO', aceitoPorId: usuarioId, dataAceite: new Date() },
      });
      return { membro };
    });

    return Result.ok({ membroId: membro.id });
  }
}
