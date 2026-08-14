import { z } from 'zod';

/**
 * Zod como fonte única de validação/tipo/schema OpenAPI — reafirma
 * docs/api/19-openapi.md §19.8 e docs/api/18-dtos.md §18.1.
 */

export const registerSchema = z.object({
  nome: z.string().min(2).max(60),
  sobrenome: z.string().min(2).max(60),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  senha: z.string().min(12, 'A senha deve ter ao menos 12 caracteres'),
  nomeEscritorio: z.string().min(2).max(120),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  senha: z.string().min(1),
  lembrarDeMim: z.boolean().optional().default(false),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(12),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const requestPasswordRecoverySchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
});
export type RequestPasswordRecoveryDto = z.infer<typeof requestPasswordRecoverySchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(12),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const switchOfficeSchema = z.object({
  escritorioId: z.string().uuid(),
});
export type SwitchOfficeDto = z.infer<typeof switchOfficeSchema>;
