import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { MAIL_PORT, MailPort } from '../../../../shared/infrastructure/mail/mail.port';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';

/**
 * Reafirma docs/api/04-identity.md §4.14 — resposta 202 sempre, nunca
 * revela se o e-mail existe (docs/09-seguranca-lgpd.md §9.2).
 */
@Injectable()
export class RequestPasswordRecoveryUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    private readonly prisma: PrismaService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async execute(email: string): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      return; // resposta ao chamador é sempre 202, independente deste caminho
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.client.tokenRecuperacaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await this.mail.send({
      to: usuario.email,
      template: 'password-recovery',
      variables: { nome: usuario.nome, token },
    });
  }
}
