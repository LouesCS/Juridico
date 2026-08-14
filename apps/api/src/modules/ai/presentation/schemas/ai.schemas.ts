import { z } from 'zod';

const tipoResumoEnum = z.enum(['GERAL', 'EXECUTIVO', 'CRONOLOGICO', 'PONTOS_CHAVE', 'RISCOS']);

/** Reafirma docs/api/14-ai.md §14.1 — `POST /legal-cases/:id/ai-summaries`. */
export const requestCaseSummarySchema = z
  .object({ tipoResumo: tipoResumoEnum.default('GERAL') })
  .strict();
export type RequestCaseSummaryDto = z.infer<typeof requestCaseSummarySchema>;

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.8 —
 * `POST /tasks/:id/ai-summaries`. Diferente de Documento/Cliente (só têm
 * um `tipoResumo` fixo cada), Tarefa tem 5 ações possíveis, por isso
 * exige o campo (default `TAREFA_RESUMO`, a ação mais genérica).
 */
const tipoResumoTarefaEnum = z.enum([
  'TAREFA_RESUMO',
  'TAREFA_CHECKLIST',
  'TAREFA_PROXIMOS_PASSOS',
  'TAREFA_DESCRICAO',
  'TAREFA_CONTEXTO',
]);
export const requestTaskSummarySchema = z
  .object({ tipoResumo: tipoResumoTarefaEnum.default('TAREFA_RESUMO') })
  .strict();
export type RequestTaskSummaryDto = z.infer<typeof requestTaskSummarySchema>;

export const summaryFeedbackSchema = z
  .object({
    feedback: z.enum(['POSITIVO', 'NEGATIVO']),
    comentarioFeedback: z.string().max(1000).optional(),
  })
  .strict();
export type SummaryFeedbackDto = z.infer<typeof summaryFeedbackSchema>;

/** Reafirma Sprint 11 §"CHAT JURÍDICO". */
export const chatSchema = z
  .object({
    escopo: z.object({
      tipo: z.enum(['PROCESSO', 'DOCUMENTO', 'GLOBAL']),
      id: z.string().uuid().optional(),
    }),
    pergunta: z.string().trim().min(2).max(1000),
  })
  .strict();
export type ChatDto = z.infer<typeof chatSchema>;
