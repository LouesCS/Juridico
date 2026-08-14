import { z } from 'zod';

export const createRoleSchema = z.object({
  nome: z.string().min(2).max(60),
  descricao: z.string().max(200).optional(),
  permissoes: z.array(z.string()).default([]),
});
export type CreateRoleDto = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  nome: z.string().min(2).max(60).optional(),
  descricao: z.string().max(200).optional(),
});
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

export const updateRolePermissionsSchema = z.object({
  permissoes: z.array(z.string()),
});
export type UpdateRolePermissionsDto = z.infer<typeof updateRolePermissionsSchema>;
