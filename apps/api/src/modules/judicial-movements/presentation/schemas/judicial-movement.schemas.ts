import { z } from 'zod';

export const listJudicialMovementsSchema = z
  .object({
    q: z.string().max(200).optional(),
    cnj: z.string().max(30).optional(),
    processo: z.string().max(150).optional(),
    cliente: z.string().max(150).optional(),
    pasta: z.string().max(150).optional(),
    tribunal: z.string().max(80).optional(),
    tipo: z.string().max(100).optional(),
    origem: z.enum(['DATAJUD', 'DJEN']).optional(),
    clientePastaId: z.string().uuid().optional(),
    encarregadoPastaId: z.string().uuid().optional(),
    parteContrariaPastaId: z.string().uuid().optional(),
    pastaJuridicaId: z.string().uuid().optional(),
    processoId: z.string().uuid().optional(),
    leitura: z.enum(['LIDA', 'NAO_LIDA']).optional(),
    tarefas: z.enum(['COM', 'SEM']).optional(),
    timeline: z.enum(['COM', 'SEM']).optional(),
    vinculoProcesso: z.enum(['COM', 'SEM']).optional(),
    responsavelId: z.string().uuid().optional(),
    movimentoDe: z.string().datetime().optional(),
    movimentoAte: z.string().datetime().optional(),
    capturaDe: z.string().datetime().optional(),
    capturaAte: z.string().datetime().optional(),
    somenteNovas: z.coerce.boolean().optional(),
    somenteComPublicacao: z.coerce.boolean().optional(),
    somenteFavoritas: z.coerce.boolean().optional(),
    sort: z
      .enum([
        '-dataMovimento',
        'dataMovimento',
        'cnj',
        'cliente',
        'tribunal',
        '-capturadoEm',
        'capturadoEm',
        '-ultimaSincronizacao',
      ])
      .default('-dataMovimento'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListJudicialMovementsQuery = z.infer<typeof listJudicialMovementsSchema>;

export const linkJudicialMovementProcessSchema = z.object({
  processoId: z.string().uuid(),
});
