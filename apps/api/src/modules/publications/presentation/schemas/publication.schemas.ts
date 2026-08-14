import { z } from 'zod';

export const listPublicationsSchema = z
  .object({
    q: z.string().max(200).optional(),
    cnj: z.string().max(30).optional(),
    processo: z.string().max(150).optional(),
    processoId: z.string().uuid().optional(),
    cliente: z.string().max(150).optional(),
    tribunal: z.string().max(80).optional(),
    tipo: z.string().max(100).optional(),
    situacao: z.enum(['NOVA', 'LIDA', 'PENDENTE']).optional(),
    publicacaoDe: z.string().datetime().optional(),
    publicacaoAte: z.string().datetime().optional(),
    cadastroDe: z.string().datetime().optional(),
    cadastroAte: z.string().datetime().optional(),
    responsavelId: z.string().uuid().optional(),
    somenteNovas: z.coerce.boolean().optional(),
    somenteNaoLidas: z.coerce.boolean().optional(),
    somenteComMovimentacao: z.coerce.boolean().optional(),
    sort: z
      .enum([
        '-dataPublicacao',
        'dataPublicacao',
        '-capturadoEm',
        'capturadoEm',
        'cnj',
        'cliente',
        'tribunal',
        '-ultimaMovimentacao',
      ])
      .default('-dataPublicacao'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListPublicationsQuery = z.infer<typeof listPublicationsSchema>;
