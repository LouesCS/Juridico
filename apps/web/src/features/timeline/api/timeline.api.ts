import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/timeline/` (módulo real
 * desde a Sprint 08 — reafirma docs/api/11-timeline.md). Eventos `PRAZO`
 * são projeção somente-leitura do backend (nunca editáveis/excluíveis por
 * este contrato); os demais tipos são gerados automaticamente pelo
 * sistema, exceto `ANOTACAO`/`PERSONALIZADO`, que só um usuário cria.
 */
export type TimelineEventType =
  | 'MOVIMENTACAO'
  | 'PETICAO'
  | 'AUDIENCIA'
  | 'DECISAO'
  | 'SENTENCA'
  | 'DOCUMENTO'
  | 'COMENTARIO'
  | 'ALTERACAO_STATUS'
  | 'PRAZO'
  | 'ANOTACAO'
  | 'PERSONALIZADO'
  | 'CRIACAO_PROCESSO'
  | 'ATUALIZACAO_PROCESSO'
  | 'ALTERACAO_RESPONSAVEL'
  | 'ALTERACAO_PRIORIDADE'
  | 'CLIENTE_ATUALIZADO'
  | 'EQUIPE_ALTERADA'
  | 'SEGREDO_JUSTICA_ALTERADO'
  | 'ARQUIVAMENTO'
  | 'RESTAURACAO'
  | 'IA_EXECUTADA'
  | 'IMPORTACAO'
  | 'EXPORTACAO'
  // Adicionados no Prompt 14 (Task Engine) — eventos próprios de Tarefa.
  | 'CRIACAO_TAREFA'
  | 'CONCLUSAO_TAREFA'
  | 'CANCELAMENTO_TAREFA';

export interface TimelineItemDTO {
  id: string;
  tipo: TimelineEventType;
  titulo: string;
  descricao: string | null;
  dataEvento: string;
  origem: 'MANUAL' | 'SISTEMA' | 'IA' | 'IMPORTACAO';
  autor: { id: string; nome: string } | null;
  entidadeRelacionada: { tipo: string; id: string } | null;
  fixado: boolean;
  editavel: boolean;
}

export interface ListCaseTimelineParams {
  tipo?: string;
  origem?: 'MANUAL' | 'SISTEMA' | 'IA' | 'IMPORTACAO';
  dataEventoGte?: string;
  dataEventoLte?: string;
  q?: string;
  autorId?: string;
  cursor?: string;
  limit?: number;
}

export interface ListCaseTimelineResult {
  items: TimelineItemDTO[];
  nextCursor: string | null;
}

export interface CreateManualTimelineEventInput {
  tipo: 'ANOTACAO' | 'PERSONALIZADO';
  titulo: string;
  descricao?: string;
  dataEvento?: string;
}

export const timelineApi = {
  list: (processoId: string, params: ListCaseTimelineParams = {}) =>
    apiClient.get<ListCaseTimelineResult>(`/legal-cases/${processoId}/timeline`, {
      query: { ...params },
    }),

  createManualEvent: (processoId: string, input: CreateManualTimelineEventInput) =>
    apiClient.post<{ id: string }>(`/legal-cases/${processoId}/timeline`, input),

  toggleFixado: (processoId: string, eventoId: string, fixado: boolean) =>
    apiClient.patch<void>(`/legal-cases/${processoId}/timeline/${eventoId}`, { fixado }),

  remove: (processoId: string, eventoId: string) =>
    apiClient.delete<void>(`/legal-cases/${processoId}/timeline/${eventoId}`),
};
