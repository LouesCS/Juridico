import { z } from 'zod';

export const createCaptureSchema = z
  .object({
    numeroCnj: z.string().min(1),
    processoId: z.string().uuid().nullable().optional(),
    capturaAtiva: z.boolean().default(true),
  })
  .strict();

export const updateCaptureSchema = z
  .object({
    numeroCnj: z.string().min(1).optional(),
    processoId: z.string().uuid().nullable().optional(),
    capturaAtiva: z.boolean().optional(),
  })
  .strict();

export const listCaptureSchema = z
  .object({
    q: z.string().max(120).optional(),
    cnj: z.string().max(30).optional(),
    processo: z.string().max(120).optional(),
    cliente: z.string().max(120).optional(),
    pastaJuridicaId: z.string().uuid().optional(),
    status: z
      .string()
      .transform((value) => value.split(',').filter(Boolean))
      .pipe(z.array(z.enum(['ATIVA', 'PAUSADA', 'SINCRONIZANDO', 'ERRO'])).max(4))
      .optional(),
    ativa: z.coerce.boolean().optional(),
    criadoDe: z.string().datetime().optional(),
    criadoAte: z.string().datetime().optional(),
    atualizadoDe: z.string().datetime().optional(),
    atualizadoAte: z.string().datetime().optional(),
    ultimaSincronizacaoDe: z.string().datetime().optional(),
    ultimaSincronizacaoAte: z.string().datetime().optional(),
    sort: z
      .enum([
        'cnj',
        '-cnj',
        'criadoEm',
        '-criadoEm',
        'atualizadoEm',
        '-atualizadoEm',
        'ultimaSincronizacaoEm',
        '-ultimaSincronizacaoEm',
      ])
      .default('-criadoEm'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateCaptureDto = z.infer<typeof createCaptureSchema>;
export type UpdateCaptureDto = z.infer<typeof updateCaptureSchema>;
export type ListCaptureQuery = z.infer<typeof listCaptureSchema>;
