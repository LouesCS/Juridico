import { z } from 'zod';

const common = z.object({
  assunto: z.string().trim().min(2).max(200),
  categoria: z.string().trim().min(1).max(120),
  situacao: z.string().trim().min(1).max(60),
  confidencial: z.boolean().default(false),
  clientePrincipalId: z.string().uuid(),
  parteContrariaPrincipalId: z.string().uuid().nullable().optional(),
  encarregadoId: z.string().uuid(),
  observacoes: z.string().max(50000).nullable().optional(),
  dataConclusao: z.string().date().nullable().optional(),
  processoIds: z.array(z.string().uuid()).max(50).default([]),
  outrosClienteIds: z.array(z.string().uuid()).max(50).default([]),
  outrasPartesContrariasIds: z.array(z.string().uuid()).max(50).default([]),
  interessadoIds: z.array(z.string().uuid()).max(50).default([]),
  camposExtrasValores: z.record(z.string()).default({}),
});

export const createLegalFolderSchema = common
  .extend({
    situacao: z.enum([
      'BAIXADO',
      'CONTRARIO',
      'DESISTENCIA',
      'ANDAMENTO_FAVORAVEL',
      'INVIAVEL',
      'SUBSTABELECIDO',
      'SUSPENSO',
    ]),
  })
  .strict();
export const updateLegalFolderSchema = common.partial().strict();
export const listLegalFoldersSchema = z
  .object({
    q: z.string().max(160).optional(),
    clienteId: z.string().uuid().optional(),
    situacao: z.string().max(60).optional(),
    encarregadoId: z.string().uuid().optional(),
    assunto: z.string().max(200).optional(),
    categoria: z.string().max(120).optional(),
    parteContraria: z.string().max(160).optional(),
    processo: z.string().max(160).optional(),
    cnj: z.string().max(30).optional(),
    criadoDe: z.string().datetime().optional(),
    criadoAte: z.string().datetime().optional(),
    possuiProcesso: z.coerce.boolean().optional(),
    possuiCaptura: z.coerce.boolean().optional(),
    sort: z
      .enum([
        'nome',
        '-nome',
        'criadoEm',
        '-criadoEm',
        'atualizadoEm',
        '-atualizadoEm',
        'encarregadoId',
        'situacao',
      ])
      .default('-atualizadoEm'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateLegalFolderDto = z.infer<typeof createLegalFolderSchema>;
export type UpdateLegalFolderDto = z.infer<typeof updateLegalFolderSchema>;
export type ListLegalFoldersQuery = z.infer<typeof listLegalFoldersSchema>;
