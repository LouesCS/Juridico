import { z } from 'zod';

/** Reafirma docs/api/11-timeline.md §11.1. */
export const listCaseTimelineQuerySchema = z
  .object({
    tipo: z.string().optional(), // lista separada por vírgula — normalizada no use case
    origem: z.enum(['MANUAL', 'SISTEMA', 'IA', 'IMPORTACAO']).optional(),
    dataEventoGte: z.string().datetime().optional(),
    dataEventoLte: z.string().datetime().optional(),
    q: z.string().max(120).optional(),
    autorId: z.string().uuid().optional(),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export type ListCaseTimelineQuery = z.infer<typeof listCaseTimelineQuerySchema>;

/** Reafirma docs/api/11-timeline.md §11.2 — só `ANOTACAO`/`PERSONALIZADO` manuais. */
export const createManualTimelineEventSchema = z
  .object({
    tipo: z.enum(['ANOTACAO', 'PERSONALIZADO']),
    titulo: z.string().min(2).max(150),
    descricao: z.string().max(4000).optional(),
    dataEvento: z.string().datetime().optional(),
  })
  .strict();
export type CreateManualTimelineEventDto = z.infer<typeof createManualTimelineEventSchema>;

export const updateManualTimelineEventSchema = z
  .object({
    titulo: z.string().min(2).max(150).optional(),
    descricao: z.string().max(4000).optional(),
    fixado: z.boolean().optional(),
  })
  .strict();
export type UpdateManualTimelineEventDto = z.infer<typeof updateManualTimelineEventSchema>;
