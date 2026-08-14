import { Injectable, Logger } from '@nestjs/common';
import { MailPort, SendMailInput } from '../mail.port';

/**
 * Adapter de desenvolvimento/teste — apenas loga o envio. Em Docker Compose
 * local, o alvo real é Mailpit/Mailhog via SmtpAdapter (não implementado
 * nesta rodada — ver docs/backend-implementation/00-status.md); este
 * adapter cobre o caso onde nenhum SMTP está disponível (ex.: ambiente de
 * teste automatizado / CI), evitando falha por dependência externa.
 */
@Injectable()
export class LogMailAdapter implements MailPort {
  private readonly logger = new Logger('MailAdapter[log]');

  async send(input: SendMailInput): Promise<void> {
    this.logger.log(`[e-mail simulado] template=${input.template} to=${input.to}`);
  }
}
