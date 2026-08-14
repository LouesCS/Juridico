import { z } from 'zod';

export const updateOfficeSchema = z.object({
  nomeFantasia: z.string().min(2).max(120).optional(),
  razaoSocial: z.string().min(2).max(160).optional(),
  cnpj: z.string().length(14).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
});
export type UpdateOfficeDto = z.infer<typeof updateOfficeSchema>;

export const deleteOfficeSchema = z.object({
  confirmacaoNome: z.string().min(1),
});
export type DeleteOfficeDto = z.infer<typeof deleteOfficeSchema>;
