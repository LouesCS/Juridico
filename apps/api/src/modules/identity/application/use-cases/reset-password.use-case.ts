import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { PasswordService } from '../../../../shared/infrastructure/security/password.service';
import { MAIL_PORT, MailPort } from '../../../../shared/infrastructure/mail/mail.port';
import { DomainError, Result } from '../../../../shared/domain/result';
import { SESSAO_REPOSITORY, SessaoRepository } from '../../domain/repositories/sessao.repository';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';

/**
 * Reafirma docs/api/04-identity.md §4.15 — revoga todas as sessões ativas +
 * notificação de segurança por e-mail.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    @Inject(SESSAO_REPOSITORY) private readonly sessaoRepository: SessaoRepository,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async execute(token: string, novaSenha: string): Promise<Result<void>> {
    const tokenHash = hashToken(token);
    const registro = await this.prisma.client.tokenRecuperacaoSenha.findFirst({
      where: { tokenHash },
    });

    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      return Result.fail(new DomainError('NOT_FOUND', 'Token inválido ou expirado.'));
    }

    const novoHash = await this.passwordService.hash(novaSenha);
    await this.usuarioRepository.atualizarSenhaHash(registro.usuarioId, novoHash);
    await this.prisma.client.tokenRecuperacaoSenha.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    });
    await this.sessaoRepository.revogarTodasDoUsuario(registro.usuarioId, undefined, 'TROCA_SENHA');

    const usuario = await this.usuarioRepository.buscarPorId(registro.usuarioId);
    if (usuario) {
      await this.mail.send({
        to: usuario.email,
        template: 'security-alert',
        variables: { nome: usuario.nome, evento: 'Sua senha foi redefinida' },
      });
    }

    return Result.ok(undefined);
  }
}
