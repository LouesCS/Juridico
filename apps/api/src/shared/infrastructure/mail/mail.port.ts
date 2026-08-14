export type MailTemplate =
  'email-verification' | 'password-recovery' | 'invitation' | 'security-alert';

export interface SendMailInput {
  to: string;
  template: MailTemplate;
  variables: Record<string, string>;
}

/**
 * Reafirma docs/backend/02-modulos.md §2.17 — nenhum use case conhece o
 * fornecedor concreto, apenas esta interface.
 */
export const MAIL_PORT = Symbol('MAIL_PORT');

export interface MailPort {
  send(input: SendMailInput): Promise<void>;
}
