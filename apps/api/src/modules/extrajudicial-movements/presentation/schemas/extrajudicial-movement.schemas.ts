import { z } from 'zod';
const body = z.object({
  dataMovimentacao: z.string().datetime(),
  clienteId: z.string().uuid().optional(),
  processoId: z.string().uuid().optional(),
  pastaId: z.string().uuid().optional(),
  pastaJuridicaId: z.string().uuid().nullable().optional(),
  responsavelId: z.string().uuid(),
  tipo: z.string().min(1).max(100),
  origem: z.string().min(1).max(100),
  status: z.string().min(1).max(100),
  descricao: z.string().min(1).max(10000),
  observacoes: z.string().max(10000).optional().nullable(),
  camposExtrasValores: z.record(z.string().uuid(), z.string().max(2000)).optional(),
});
export const createExtrajudicialMovementSchema = body.refine((v) => v.clienteId || v.processoId, {
  message: 'Informe Cliente ou Processo.',
});
export const updateExtrajudicialMovementSchema = body.partial();
export const editExtrajudicialMovementSchema = z
  .object({
    dataMovimentacao: z.string().datetime().optional(),
    descricao: z.string().min(1).max(10000).optional(),
  })
  .strict()
  .refine((value) => value.dataMovimentacao !== undefined || value.descricao !== undefined, {
    message: 'Informe ao menos um campo para edição.',
  });
export type MovementEdit = z.infer<typeof editExtrajudicialMovementSchema>;
export const listExtrajudicialMovementsSchema = z
  .object({
    q: z.string().max(200).optional(),
    cliente: z.string().optional(),
    processo: z.string().optional(),
    processoId: z.string().uuid().optional(),
    pasta: z.string().optional(),
    pastaJuridicaId: z.string().uuid().optional(),
    tipo: z.string().optional(),
    responsavelId: z.string().uuid().optional(),
    origem: z.string().optional(),
    status: z.string().optional(),
    dataDe: z.string().datetime().optional(),
    dataAte: z.string().datetime().optional(),
    criadoDe: z.string().datetime().optional(),
    criadoAte: z.string().datetime().optional(),
    clientePastaId: z.string().uuid().optional(),
    encarregadoPastaId: z.string().uuid().optional(),
    parteContrariaPastaId: z.string().uuid().optional(),
    leitura: z.enum(['LIDA', 'NAO_LIDA']).optional(),
    tarefas: z.enum(['COM', 'SEM']).optional(),
    timeline: z.enum(['COM', 'SEM']).optional(),
    favoritas: z.coerce.boolean().optional(),
    pendentes: z.coerce.boolean().optional(),
    concluidas: z.coerce.boolean().optional(),
    sort: z
      .enum([
        '-dataMovimentacao',
        'dataMovimentacao',
        'cliente',
        'processo',
        'responsavel',
        'tipo',
        '-criadoEm',
        'criadoEm',
        '-atualizadoEm',
      ])
      .default('-dataMovimentacao'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type MovementBody = z.infer<typeof createExtrajudicialMovementSchema>;
export type MovementList = z.infer<typeof listExtrajudicialMovementsSchema>;
