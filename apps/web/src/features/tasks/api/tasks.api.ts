import { apiClient } from '@/lib/api/client';
import type { TimelineItemDTO } from '@/features/timeline';

/**
 * Tipos manuais espelhando `apps/api/src/modules/tasks/` (Prompt 14 — Task
 * Engine). Mesma pendência de `openapi-typescript` já registrada em
 * docs/frontend-implementation/19-decisions.md §19.2. Status/Prioridade
 * nunca são um union fixo aqui — vêm de `TaskConfigDTO` (Conjuntos de
 * Valores do Configuration Engine, Prompt 13), sempre `{id, valor}`.
 */
export const TASK_LINK_TYPES = [
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
export type TaskLinkType = (typeof TASK_LINK_TYPES)[number];

export const TASK_RECURRENCE_FREQUENCIES = [
  'DIARIA',
  'SEMANAL',
  'MENSAL',
  'ANUAL',
  'DIAS_UTEIS',
  'DIAS_ESPECIFICOS',
] as const;
export type TaskRecurrenceFrequency = (typeof TASK_RECURRENCE_FREQUENCIES)[number];

export interface TaskValueRefDTO {
  id: string;
  valor: string;
}

export interface TaskCategoryRefDTO {
  id: string;
  nome: string;
  cor: string;
}

export interface TaskMemberRefDTO {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

export interface TaskListItemDTO {
  id: string;
  titulo: string;
  categoria: TaskCategoryRefDTO | null;
  status: TaskValueRefDTO | null;
  prioridade: TaskValueRefDTO | null;
  responsavel: TaskMemberRefDTO | null;
  solicitante: TaskMemberRefDTO | null;
  vinculos: Array<{
    tipoRecurso: TaskLinkType;
    recursoId: string;
    recurso: { id: string; nome: string; numeroCnj?: string | null } | null;
  }>;
  dataVencimento: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  arquivadaEm: string | null;
  favorita: boolean;
  atrasada: boolean;
}

export interface ListTasksParams {
  q?: string;
  escopo?: 'meus' | 'equipe' | 'todos';
  statusId?: string;
  categoriaId?: string;
  prioridadeId?: string;
  responsavelId?: string;
  equipeId?: string;
  clienteId?: string;
  processoId?: string;
  pastaJuridicaId?: string;
  publicacaoId?: string;
  concluidas?: boolean;
  pendentes?: boolean;
  atrasadas?: boolean;
  favoritas?: boolean;
  dataVencimentoDe?: string;
  dataVencimentoAte?: string;
  sort?: 'dataVencimento' | '-dataVencimento' | 'criadoEm' | '-criadoEm';
  cursor?: string;
  limit?: number;
}

export interface ListTasksResult {
  items: TaskListItemDTO[];
  nextCursor: string | null;
}

export interface TaskChecklistItemDTO {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  ordem: number;
  concluidoEm: string | null;
}

export interface TaskLinkDTO {
  id: string;
  tipoRecurso: TaskLinkType;
  recursoId: string;
}

export interface TaskDependencyRefDTO {
  id: string;
  titulo: string;
  concluidaEm: string | null;
}

export interface TaskDetailDTO {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: TaskCategoryRefDTO | null;
  status: TaskValueRefDTO | null;
  prioridade: TaskValueRefDTO | null;
  responsavel: TaskMemberRefDTO | null;
  responsaveisAuxiliares: TaskMemberRefDTO[];
  equipeId: string | null;
  grupoColaboradoresId: string | null;
  dataInicio: string | null;
  dataVencimento: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  arquivadaEm: string | null;
  recorrenciaId: string | null;
  tarefaOrigemId: string | null;
  checklist: TaskChecklistItemDTO[];
  vinculos: TaskLinkDTO[];
  dependencias: TaskDependencyRefDTO[];
  bloqueando: TaskDependencyRefDTO[];
  favorita: boolean;
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TaskRecurrenceInput {
  frequencia: TaskRecurrenceFrequency;
  intervalo?: number;
  diasSemana?: number[];
  respeitarDiasUteis?: boolean;
  dataFim?: string;
}

export interface CreateTaskInput {
  titulo: string;
  descricao?: string;
  categoriaId?: string;
  statusId?: string;
  prioridadeId?: string;
  responsavelPrincipalId?: string;
  responsaveisAuxiliaresIds?: string[];
  equipeId?: string;
  grupoColaboradoresId?: string;
  dataInicio?: string;
  dataVencimento?: string;
  checklist?: Array<{ titulo: string; obrigatorio?: boolean; ordem?: number }>;
  dependeDeIds?: string[];
  vinculos?: Array<{ tipoRecurso: TaskLinkType; recursoId: string }>;
  recorrencia?: TaskRecurrenceInput;
}

export interface UpdateTaskInput {
  titulo?: string;
  descricao?: string;
  categoriaId?: string | null;
  statusId?: string | null;
  prioridadeId?: string | null;
  responsavelPrincipalId?: string | null;
  equipeId?: string | null;
  grupoColaboradoresId?: string | null;
  dataInicio?: string | null;
  dataVencimento?: string | null;
}

export interface CreateTaskFromTemplateInput {
  modeloId: string;
  dataVencimento?: string;
  responsavelPrincipalId?: string;
  vinculos?: Array<{ tipoRecurso: TaskLinkType; recursoId: string }>;
}

export interface TaskConfigDTO {
  status: Array<{ id: string; valor: string; ordem: number }>;
  prioridade: Array<{ id: string; valor: string; ordem: number }>;
}

export interface TaskDashboardDTO {
  minhasTarefasPendentes: number;
  equipeTarefasPendentes: number;
  atrasadas: number;
  hoje: number;
  proximas: number;
  concluidasNoMes: number;
  produtividade: { concluidas: number; criadas: number; percentual: number };
}

export interface TaskCommentDTO {
  id: string;
  tarefaId: string;
  autorId: string;
  conteudo: string;
  criadoEm: string;
  editado: boolean;
}

export interface TaskTimelineParams {
  tipo?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface TaskTimelineResult {
  items: TimelineItemDTO[];
  nextCursor: string | null;
}

export const tasksApi = {
  getConfig: () => apiClient.get<TaskConfigDTO>('/tasks/config'),

  getDashboard: () => apiClient.get<TaskDashboardDTO>('/tasks/dashboard-summary'),

  list: (params: ListTasksParams = {}) =>
    apiClient.get<ListTasksResult>('/tasks', { query: { ...params } }),

  create: (input: CreateTaskInput) => apiClient.post<{ id: string }>('/tasks', input),

  createFromTemplate: (input: CreateTaskFromTemplateInput) =>
    apiClient.post<{ id: string }>('/tasks/from-template', input),

  get: (tarefaId: string) => apiClient.get<TaskDetailDTO>(`/tasks/${tarefaId}`),

  update: (tarefaId: string, input: UpdateTaskInput) =>
    apiClient.patch<void>(`/tasks/${tarefaId}`, input),

  remove: (tarefaId: string) => apiClient.delete<void>(`/tasks/${tarefaId}`),

  archive: (tarefaId: string) => apiClient.post<void>(`/tasks/${tarefaId}/archive`),

  restore: (tarefaId: string) => apiClient.post<void>(`/tasks/${tarefaId}/restore`),

  duplicate: (tarefaId: string) => apiClient.post<{ id: string }>(`/tasks/${tarefaId}/duplicate`),

  move: (tarefaId: string, statusId: string | null) =>
    apiClient.post<void>(`/tasks/${tarefaId}/move`, { statusId }),

  reopen: (tarefaId: string) => apiClient.post<void>(`/tasks/${tarefaId}/reopen`),

  complete: (tarefaId: string) =>
    apiClient.post<{ proximaOcorrenciaId: string | null }>(`/tasks/${tarefaId}/complete`),

  cancel: (tarefaId: string, motivo?: string) =>
    apiClient.post<void>(`/tasks/${tarefaId}/cancel`, { motivo }),

  toggleFavorite: (tarefaId: string) =>
    apiClient.post<{ favorita: boolean }>(`/tasks/${tarefaId}/favorite`),

  addChecklistItem: (
    tarefaId: string,
    input: { titulo: string; obrigatorio?: boolean; ordem?: number },
  ) => apiClient.post<{ id: string }>(`/tasks/${tarefaId}/checklist`, input),

  updateChecklistItem: (
    tarefaId: string,
    itemId: string,
    input: { titulo?: string; obrigatorio?: boolean; ordem?: number; concluido?: boolean },
  ) => apiClient.patch<void>(`/tasks/${tarefaId}/checklist/${itemId}`, input),

  removeChecklistItem: (tarefaId: string, itemId: string) =>
    apiClient.delete<void>(`/tasks/${tarefaId}/checklist/${itemId}`),

  addDependency: (tarefaId: string, dependeDeId: string) =>
    apiClient.post<void>(`/tasks/${tarefaId}/dependencies`, { dependeDeId }),

  removeDependency: (tarefaId: string, dependeDeId: string) =>
    apiClient.delete<void>(`/tasks/${tarefaId}/dependencies/${dependeDeId}`),

  addLink: (tarefaId: string, input: { tipoRecurso: TaskLinkType; recursoId: string }) =>
    apiClient.post<{ id: string }>(`/tasks/${tarefaId}/links`, input),

  removeLink: (tarefaId: string, vinculoId: string) =>
    apiClient.delete<void>(`/tasks/${tarefaId}/links/${vinculoId}`),

  addResponsible: (tarefaId: string, membroId: string) =>
    apiClient.post<void>(`/tasks/${tarefaId}/responsibles`, { membroId }),

  removeResponsible: (tarefaId: string, membroId: string) =>
    apiClient.delete<void>(`/tasks/${tarefaId}/responsibles/${membroId}`),

  listComments: (tarefaId: string) =>
    apiClient.get<TaskCommentDTO[]>(`/tasks/${tarefaId}/comments`),

  createComment: (tarefaId: string, conteudo: string) =>
    apiClient.post<{ id: string }>(`/tasks/${tarefaId}/comments`, { conteudo }),

  listTimeline: (tarefaId: string, params: TaskTimelineParams = {}) =>
    apiClient.get<TaskTimelineResult>(`/tasks/${tarefaId}/timeline`, { query: { ...params } }),
};
