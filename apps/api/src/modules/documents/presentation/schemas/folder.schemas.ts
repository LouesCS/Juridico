import { z } from 'zod';

/** Reafirma docs/api/10-documents.md §10.6 — árvore de pastas por processo ou biblioteca geral. */
export const listFoldersQuerySchema = z
  .object({
    processoId: z.string().uuid().optional(),
    q: z.string().max(120).optional(),
  })
  .strict();
export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;

export const createFolderSchema = z
  .object({
    nome: z.string().min(1).max(120),
    processoId: z.string().uuid().optional(),
    pastaPaiId: z.string().uuid().optional(),
  })
  .strict();
export type CreateFolderDto = z.infer<typeof createFolderSchema>;

/** `pastaPaiId: null` explícito move para a raiz (biblioteca ou raiz do processo). */
export const updateFolderSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    pastaPaiId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type UpdateFolderDto = z.infer<typeof updateFolderSchema>;

export const reorderFolderSchema = z
  .object({
    ordem: z.coerce.number().int().min(0),
  })
  .strict();
export type ReorderFolderDto = z.infer<typeof reorderFolderSchema>;

export const deleteFolderQuerySchema = z
  .object({
    cascata: z.coerce.boolean().default(false),
  })
  .strict();
export type DeleteFolderQuery = z.infer<typeof deleteFolderQuerySchema>;
