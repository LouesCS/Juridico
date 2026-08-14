import { z } from 'zod';

const money = z.string().regex(/^\d+$/, 'Informe o valor em centavos.').optional().nullable();
export const requestBodySchema = z.object({
  pastaJuridicaId: z.string().uuid(),
  processoId: z.string().uuid().optional().nullable(),
  descricao: z.string().trim().min(1).max(300),
  categoria: z.string().trim().min(1).max(100),
  situacao: z.string().trim().min(1).max(100).default('EM_ANDAMENTO'),
  dataFinalizacao: z.string().date().optional().nullable(),
  estimativaExito: z.coerce.number().min(0).max(100).optional().nullable(),
  valorPedidoCentavos: money,
  valorProvavelCentavos: money,
  valorPossivelCentavos: money,
  valorRemotoCentavos: money,
  valorFinalCentavos: money,
  anotacoes: z.string().max(1000).optional().nullable(),
});
export const updateRequestSchema = requestBodySchema.omit({ pastaJuridicaId: true }).partial();
export const listRequestsSchema = z.object({
  q: z.string().max(200).optional(), situacao: z.string().optional(), categoria: z.string().optional(),
  pastaJuridicaId: z.string().uuid().optional(), processoId: z.string().uuid().optional(),
  dataFinalizacaoDe: z.string().date().optional(), dataFinalizacaoAte: z.string().date().optional(),
  estimativaMin: z.coerce.number().min(0).max(100).optional(), estimativaMax: z.coerce.number().min(0).max(100).optional(),
  valorPedidoMin: z.coerce.bigint().nonnegative().optional(), valorPedidoMax: z.coerce.bigint().nonnegative().optional(),
  valorProvavelMin: z.coerce.bigint().nonnegative().optional(), valorProvavelMax: z.coerce.bigint().nonnegative().optional(),
  valorPossivelMin: z.coerce.bigint().nonnegative().optional(), valorPossivelMax: z.coerce.bigint().nonnegative().optional(),
  valorRemotoMin: z.coerce.bigint().nonnegative().optional(), valorRemotoMax: z.coerce.bigint().nonnegative().optional(),
  valorFinalMin: z.coerce.bigint().nonnegative().optional(), valorFinalMax: z.coerce.bigint().nonnegative().optional(),
  sort: z.enum(['-criadoEm','criadoEm','descricao','-descricao','dataFinalizacao','-dataFinalizacao','valorPedido','-valorPedido','situacao']).default('-criadoEm'),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict().superRefine((v, ctx) => {
  const ranges: Array<[string, bigint | number | string | undefined, bigint | number | string | undefined]> = [
    ['estimativa', v.estimativaMin, v.estimativaMax], ['valor pedido', v.valorPedidoMin, v.valorPedidoMax], ['valor provável', v.valorProvavelMin, v.valorProvavelMax], ['valor possível', v.valorPossivelMin, v.valorPossivelMax], ['valor remoto', v.valorRemotoMin, v.valorRemotoMax], ['valor final', v.valorFinalMin, v.valorFinalMax], ['data de finalização', v.dataFinalizacaoDe, v.dataFinalizacaoAte],
  ];
  for (const [name, min, max] of ranges) if (min !== undefined && max !== undefined && min > max) ctx.addIssue({ code: 'custom', message: `Intervalo de ${name} inválido.` });
});
export type RequestBody = z.infer<typeof requestBodySchema>;
export type RequestUpdate = z.infer<typeof updateRequestSchema>;
export type RequestList = z.infer<typeof listRequestsSchema>;
