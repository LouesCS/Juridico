import { z } from 'zod';

export const listPublicationsSchema = z
  .object({
    q: z.string().max(200).optional(),
    cnj: z.string().max(30).optional(),
    processo: z.string().max(150).optional(),
    processoId: z.string().uuid().optional(),
    cliente: z.string().max(150).optional(),
    tribunal: z.string().max(80).optional(),
    cidade: z.string().max(100).optional(),
    diario: z.string().max(120).optional(),
    nomeVinculo: z.string().max(160).optional(),
    orgao: z.string().max(160).optional(),
    vara: z.string().max(160).optional(),
    pastaId: z.string().uuid().optional(),
    clientePastaId: z.string().uuid().optional(),
    encarregadoPastaId: z.string().uuid().optional(),
    parteContrariaPastaId: z.string().uuid().optional(),
    vinculoTarefa: z.enum(['COM', 'SEM']).optional(),
    timeline: z.enum(['COM', 'SEM']).optional(),
    vinculoPasta: z.enum(['COM', 'SEM']).optional(),
    visualizacao: z.enum(['OCULTAS', 'NAO_OCULTAS']).optional(),
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
  .strict()
  .superRefine((value, ctx) => {
    for (const [from, to, label] of [
      ['publicacaoDe', 'publicacaoAte', 'Data da publicação'],
      ['cadastroDe', 'cadastroAte', 'Data de cadastro'],
    ] as const) {
      if (value[from] && value[to] && value[from] > value[to]) {
        ctx.addIssue({
          code: 'custom',
          path: [to],
          message: `${label}: data mínima deve ser anterior à máxima.`,
        });
      }
    }
  });
export type ListPublicationsQuery = z.infer<typeof listPublicationsSchema>;

export const linkPublicationSchema = z
  .object({
    pastaJuridicaId: z.string().uuid(),
    processoId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type LinkPublicationDto = z.infer<typeof linkPublicationSchema>;
