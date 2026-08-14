import { z } from 'zod';

/** Espelha `changePasswordSchema` real (identity.schemas.ts). */
export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe sua senha atual.'),
    novaSenha: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
