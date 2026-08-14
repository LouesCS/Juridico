import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/ai/` (Sprint 11). Reafirma
 * docs/api/14-ai.md — `custoEstimadoCentavos`/`tokensEntrada`/`tokensSaida`
 * só existem no payload quando o backend decide incluí-los (usuário com
 * `ai:usage:read`); por isso os 3 campos são opcionais aqui, nunca
 * presumidos.
 */
export type EscopoResumoIA = 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE' | 'TAREFA';
export type TipoResumoIA =
  | 'GERAL'
  | 'EXECUTIVO'
  | 'CRONOLOGICO'
  | 'PONTOS_CHAVE'
  | 'RISCOS'
  | 'RESUMO_DOCUMENTO'
  | 'HISTORICO_CLIENTE'
  // Adicionados no Prompt 14 (Task Engine) — 5 ações de IA de Tarefa.
  | 'TAREFA_RESUMO'
  | 'TAREFA_CHECKLIST'
  | 'TAREFA_PROXIMOS_PASSOS'
  | 'TAREFA_DESCRICAO'
  | 'TAREFA_CONTEXTO';
export type StatusResumoIA = 'PENDENTE' | 'GERANDO' | 'PRONTO' | 'FALHA' | 'EXPIRADO';
export type FeedbackResumo = 'POSITIVO' | 'NEGATIVO';

export interface AiSummaryDTO {
  id: string;
  escopoTipo: EscopoResumoIA;
  processoId: string | null;
  documentoId: string | null;
  clienteId: string | null;
  tipoResumo: TipoResumoIA;
  versaoResumo: number;
  status: StatusResumoIA;
  conteudo: string | null;
  estruturaJson: unknown;
  modelo: string;
  promptVersion: string;
  erro: string | null;
  feedback: FeedbackResumo | null;
  comentarioFeedback: string | null;
  vigente: boolean;
  geradoEm: string | null;
  criadoEm: string;
  streamUrl: string;
  tokensEntrada?: number;
  tokensSaida?: number;
  custoEstimadoCentavos?: number;
  latenciaMs?: number;
}

export interface AiSourceDTO {
  id: string;
  sourceType: 'DOCUMENTO' | 'EVENTO_TIMELINE' | 'METADADO_PROCESSO' | 'PROCESSO' | 'CLIENTE' | 'TAREFA';
  documentoId: string | null;
  eventoTimelineId: string | null;
  processoId: string | null;
  clienteId: string | null;
  tarefaId: string | null;
  ordem: number;
  trechoOuReferencia: string | null;
}

export interface RequestSummaryResult {
  id: string;
  status: StatusResumoIA;
  streamUrl: string;
}

export type ChatScope = { tipo: 'PROCESSO' | 'DOCUMENTO'; id: string } | { tipo: 'GLOBAL' };

export interface ChatFonte {
  tipo: string;
  id: string | null;
  titulo: string;
  url: string | null;
}

export interface ChatResult {
  resposta: string;
  fontes: ChatFonte[];
  modelo: string;
  tempoGeracaoMs: number;
}

export interface AiUsageDTO {
  mesReferencia: string;
  resumosGerados: number;
  cotaMensal: number | null;
  custoEstimadoCentavosTotal: number;
  porTipo: Record<string, number>;
}

const scopePath = (escopoTipo: EscopoResumoIA): string => {
  if (escopoTipo === 'DOCUMENTO') return 'documents';
  if (escopoTipo === 'CLIENTE') return 'clients';
  if (escopoTipo === 'TAREFA') return 'tasks';
  return 'legal-cases';
};

export const aiApi = {
  requestSummary: (escopoTipo: EscopoResumoIA, escopoId: string, tipoResumo?: TipoResumoIA) =>
    apiClient.post<RequestSummaryResult>(
      `/${scopePath(escopoTipo)}/${escopoId}/ai-summaries`,
      escopoTipo === 'PROCESSO'
        ? { tipoResumo: tipoResumo ?? 'GERAL' }
        : escopoTipo === 'TAREFA'
          ? { tipoResumo: tipoResumo ?? 'TAREFA_RESUMO' }
          : undefined,
    ),

  listSummaries: (escopoTipo: EscopoResumoIA, escopoId: string) =>
    apiClient.get<AiSummaryDTO[]>(`/${scopePath(escopoTipo)}/${escopoId}/ai-summaries`),

  getSummary: (id: string) => apiClient.get<AiSummaryDTO>(`/ai-summaries/${id}`),

  regenerate: (id: string) => apiClient.post<RequestSummaryResult>(`/ai-summaries/${id}/regenerate`),

  cancel: (id: string) => apiClient.post<void>(`/ai-summaries/${id}/cancel`),

  feedback: (id: string, feedback: FeedbackResumo, comentarioFeedback?: string) =>
    apiClient.post<void>(`/ai-summaries/${id}/feedback`, { feedback, comentarioFeedback }),

  getSources: (id: string) => apiClient.get<AiSourceDTO[]>(`/ai-summaries/${id}/sources`),

  chat: (escopo: ChatScope, pergunta: string) => apiClient.post<ChatResult>('/ai/chat', { escopo, pergunta }),

  dashboardInsights: () => apiClient.get<{ insights: string[] }>('/ai/dashboard-insights'),

  usage: () => apiClient.get<AiUsageDTO>('/office/ai-usage'),
};
