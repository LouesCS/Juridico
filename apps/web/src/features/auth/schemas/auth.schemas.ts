import { z } from 'zod';

/**
 * Espelha os schemas Zod reais do backend
 * (apps/api/src/modules/identity/presentation/schemas/identity.schemas.ts)
 * — mesmos nomes de campo, mesmas regras mínimas — mas é um contrato
 * distinto por propósito: valida entrada de formulário (mensagens em
 * português), não tipa resposta de API. Reafirma
 * docs/frontend/09-openapi.md §9.2.
 */

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe sua senha.'),
  lembrarDeMim: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  nome: z.string().min(2, 'Informe seu nome.').max(60),
  sobrenome: z.string().min(2, 'Informe seu sobrenome.').max(60),
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  senha: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.'),
  nomeEscritorio: z.string().min(2, 'Informe o nome do escritório.').max(120),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    novaSenha: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
