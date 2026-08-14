import { z } from 'zod';

/**
 * Espelha `inviteMemberSchema`/`acceptInvitationSchema` reais
 * (apps/api/src/modules/memberships/presentation/schemas/membership.schemas.ts).
 */
export const inviteMemberSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  papelId: z.string().min(1, 'Selecione um papel.'),
});
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

/**
 * Campos opcionais no backend (só obrigatórios se o e-mail do convite
 * ainda não tiver conta) — validados aqui só quando preenchidos, a
 * decisão final de exigi-los ou não é sempre do backend (422
 * `MALFORMED_REQUEST` se faltarem e forem necessários).
 */
export const acceptInvitationSchema = z.object({
  nome: z.union([z.literal(''), z.string().min(2, 'Nome muito curto.').max(60)]),
  sobrenome: z.union([z.literal(''), z.string().min(2, 'Sobrenome muito curto.').max(60)]),
  senha: z.union([z.literal(''), z.string().min(12, 'A senha deve ter ao menos 12 caracteres.')]),
});
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
