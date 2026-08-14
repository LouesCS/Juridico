import { z } from 'zod';

/** Reafirma docs/backend-implementation/23-task-engine.md. */
export const TIPO_VINCULO_TAREFA = [
  'CLIENTE',
  'PROCESSO',
  'DOCUMENTO',
  'CONTRATO',
  'SERVICO',
  'FINANCEIRO',
  'PUBLICACAO',
  'PEDIDO',
  'REGISTRO_TRABALHO',
  'PASTA_JURIDICA',
  'MOVIMENTACAO_EXTRAJUDICIAL',
  'MOVIMENTACAO_JUDICIAL',
] as const;

export const FREQUENCIA_RECORRENCIA = [
  'DIARIA',
  'SEMANAL',
  'MENSAL',
  'ANUAL',
  'DIAS_UTEIS',
  'DIAS_ESPECIFICOS',
] as const;

const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');

const recorrenciaSchema = z
  .object({
    frequencia: z.enum(FREQUENCIA_RECORRENCIA),
    intervalo: z.number().int().min(1).default(1),
    diasSemana: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    respeitarDiasUteis: z.boolean().default(false),
    dataFim: dataSchema.optional(),
  })
  .strict();

export const createTaskSchema = z
  .object({
    titulo: z.string().min(2).max(200),
    descricao: z.string().max(4000).optional(),
    categoriaId: z.string().uuid().optional(),
    statusId: z.string().uuid().optional(),
    prioridadeId: z.string().uuid().optional(),
    responsavelPrincipalId: z.string().uuid().optional(),
    responsaveisAuxiliaresIds: z.array(z.string().uuid()).max(20).default([]),
    equipeId: z.string().uuid().optional(),
    grupoColaboradoresId: z.string().uuid().optional(),
    dataInicio: dataSchema.optional(),
    dataVencimento: dataSchema.optional(),
    checklist: z
      .array(
        z
          .object({
            titulo: z.string().min(1).max(200),
            obrigatorio: z.boolean().default(false),
            ordem: z.number().int().min(0).default(0),
          })
          .strict(),
      )
      .max(100)
      .default([]),
    dependeDeIds: z.array(z.string().uuid()).max(50).default([]),
    vinculos: z
      .array(
        z
          .object({ tipoRecurso: z.enum(TIPO_VINCULO_TAREFA), recursoId: z.string().uuid() })
          .strict(),
      )
      .max(50)
      .default([]),
    recorrencia: recorrenciaSchema.optional(),
  })
  .strict();
export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    titulo: z.string().min(2).max(200).optional(),
    descricao: z.string().max(4000).optional(),
    categoriaId: z.string().uuid().nullable().optional(),
    statusId: z.string().uuid().nullable().optional(),
    prioridadeId: z.string().uuid().nullable().optional(),
    responsavelPrincipalId: z.string().uuid().nullable().optional(),
    equipeId: z.string().uuid().nullable().optional(),
    grupoColaboradoresId: z.string().uuid().nullable().optional(),
    dataInicio: dataSchema.nullable().optional(),
    dataVencimento: dataSchema.nullable().optional(),
  })
  .strict();
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z
  .object({
    statusId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type MoveTaskDto = z.infer<typeof moveTaskSchema>;

export const cancelTaskSchema = z.object({ motivo: z.string().max(500).optional() }).strict();
export type CancelTaskDto = z.infer<typeof cancelTaskSchema>;

export const createTaskFromTemplateSchema = z
  .object({
    modeloId: z.string().uuid(),
    dataVencimento: dataSchema.optional(),
    responsavelPrincipalId: z.string().uuid().optional(),
  })
  .strict();
export type CreateTaskFromTemplateDto = z.infer<typeof createTaskFromTemplateSchema>;

export const listTasksQuerySchema = z
  .object({
    q: z.string().max(120).optional(),
    escopo: z.enum(['meus', 'equipe', 'todos']).optional(),
    statusId: z.string().uuid().optional(),
    categoriaId: z.string().uuid().optional(),
    prioridadeId: z.string().uuid().optional(),
    responsavelId: z.string().uuid().optional(),
    equipeId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    processoId: z.string().uuid().optional(),
    pastaJuridicaId: z.string().uuid().optional(),
    concluidas: z.coerce.boolean().optional(),
    pendentes: z.coerce.boolean().optional(),
    atrasadas: z.coerce.boolean().optional(),
    favoritas: z.coerce.boolean().optional(),
    dataVencimentoDe: dataSchema.optional(),
    dataVencimentoAte: dataSchema.optional(),
    sort: z
      .enum(['dataVencimento', '-dataVencimento', '-criadoEm', 'criadoEm'])
      .default('dataVencimento'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const addChecklistItemSchema = z
  .object({
    titulo: z.string().min(1).max(200),
    obrigatorio: z.boolean().default(false),
    ordem: z.number().int().min(0).default(0),
  })
  .strict();
export type AddChecklistItemDto = z.infer<typeof addChecklistItemSchema>;

export const updateChecklistItemSchema = z
  .object({
    titulo: z.string().min(1).max(200).optional(),
    obrigatorio: z.boolean().optional(),
    ordem: z.number().int().min(0).optional(),
    concluido: z.boolean().optional(),
  })
  .strict();
export type UpdateChecklistItemDto = z.infer<typeof updateChecklistItemSchema>;

export const addDependencySchema = z.object({ dependeDeId: z.string().uuid() }).strict();
export type AddDependencyDto = z.infer<typeof addDependencySchema>;

export const addResponsavelAuxiliarSchema = z.object({ membroId: z.string().uuid() }).strict();
export type AddResponsavelAuxiliarDto = z.infer<typeof addResponsavelAuxiliarSchema>;

export const addTaskLinkSchema = z
  .object({ tipoRecurso: z.enum(TIPO_VINCULO_TAREFA), recursoId: z.string().uuid() })
  .strict();
export type AddTaskLinkDto = z.infer<typeof addTaskLinkSchema>;

export const createTaskCommentSchema = z.object({ conteudo: z.string().min(1).max(4000) }).strict();
export type CreateTaskCommentDto = z.infer<typeof createTaskCommentSchema>;

export const listTaskTimelineQuerySchema = z
  .object({
    tipo: z.string().optional(), // lista separada por vírgula — normalizada no use case
    q: z.string().max(120).optional(),
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export type ListTaskTimelineQuery = z.infer<typeof listTaskTimelineQuerySchema>;
