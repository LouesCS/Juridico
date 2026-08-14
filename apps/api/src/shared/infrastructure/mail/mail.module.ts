import { Global, Module } from '@nestjs/common';
import { LogMailAdapter } from './adapters/log.adapter';
import { MAIL_PORT } from './mail.port';

/**
 * Reafirma docs/backend/02-modulos.md §2.17. Nesta etapa, apenas o adapter
 * de log está implementado (Smtp/Ses/Sendgrid ficam como pendência explícita
 * — ver docs/backend-implementation/00-status.md); a seleção por
 * MAIL_PROVIDER já está prevista na env, o binding real é o próximo passo.
 */
@Global()
@Module({
  providers: [{ provide: MAIL_PORT, useClass: LogMailAdapter }],
  exports: [MAIL_PORT],
})
export class MailModule {}
