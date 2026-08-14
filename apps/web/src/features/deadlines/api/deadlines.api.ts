import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/legal-cases/` (Prazos são
 * modelados dentro de Legal Cases, não em módulo próprio — reafirma
 * docs/api/09-legal-cases.md §9.4). Sprint 08: agregado real
 * `GET /v1/deadlines` ganhou filtros/paginação completos; ações
 * (concluir/reabrir/duplicar/cancelar/editar) continuam nas rotas
 * aninhadas `/legal-cases/:id/deadlines/:prazoId/*`.
 */
export type DeadlineType = 'FATAL' | 'INTERNO' | 'AUDIENCIA' | 'REUNIAO' | 'TAREFA';
export type DeadlinePriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type DeadlineStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'ATRASADO';

export interface DeadlineListItemDTO {
  id: string;
  titulo: string;
  tipo: DeadlineType;
  origem: 'MANUAL' | 'IMPORTADO' | 'IA' | 'TRIBUNAL';
  dataVencimento: string;
  prioridade: DeadlinePriority;
  status: DeadlineStatus;
  criadoEm: string;
  processo: { id: string; titulo: string; numeroCnj: string | null };
  cliente: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
}

export interface ListDeadlinesParams {
  escopo?: 'meus' | 'equipe' | 'todos';
  status?: DeadlineStatus;
  tipo?: DeadlineType;
  prioridade?: DeadlinePriority;
  responsavelId?: string;
  clienteId?: string;
  processoId?: string;
  q?: string;
  dataVencimentoDe?: string;
  dataVencimentoAte?: string;
  sort?: 'dataVencimento' | '-dataVencimento' | 'prioridade';
  cursor?: string;
  limit?: number;
}

export interface ListDeadlinesResult {
  items: DeadlineListItemDTO[];
  nextCursor: string | null;
}

export interface CreateDeadlineInput {
  titulo: string;
  descricao?: string;
  tipo: DeadlineType;
  dataVencimento: string;
  horaVencimento?: string;
  responsavelId: string;
  prioridade?: DeadlinePriority;
}

export interface UpdateDeadlineInput {
  titulo?: string;
  descricao?: string;
  dataVencimento?: string;
  horaVencimento?: string;
  responsavelId?: string;
  prioridade?: DeadlinePriority;
  status?: DeadlineStatus;
}

export const deadlinesApi = {
  list: (params: ListDeadlinesParams = {}) =>
    apiClient.get<ListDeadlinesResult>('/deadlines', { query: { ...params } }),

  create: (processoId: string, input: CreateDeadlineInput) =>
    apiClient.post<{ id: string }>(`/legal-cases/${processoId}/deadlines`, input),

  update: (processoId: string, prazoId: string, input: UpdateDeadlineInput) =>
    apiClient.patch<void>(`/legal-cases/${processoId}/deadlines/${prazoId}`, input),

  cancel: (processoId: string, prazoId: string, motivoCancelamento?: string) =>
    apiClient.delete<void>(`/legal-cases/${processoId}/deadlines/${prazoId}`, { motivoCancelamento }),

  complete: (processoId: string, prazoId: string) =>
    apiClient.post<void>(`/legal-cases/${processoId}/deadlines/${prazoId}/complete`),

  reopen: (processoId: string, prazoId: string) =>
    apiClient.post<void>(`/legal-cases/${processoId}/deadlines/${prazoId}/reopen`),

  duplicate: (processoId: string, prazoId: string) =>
    apiClient.post<{ id: string }>(`/legal-cases/${processoId}/deadlines/${prazoId}/duplicate`),
};
