import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/configuration/` (Sprint
 * 13 — Configuration Engine). Mesma pendência de `openapi-typescript` já
 * registrada em docs/frontend-implementation/19-decisions.md §19.2, mesmo
 * padrão de `features/permissions/api/permissions.api.ts`.
 */
export type EntidadeConfiguravel =
  'CLIENTE' | 'PROCESSO' | 'DOCUMENTO' | 'TAREFA' | 'MOVIMENTACAO_EXTRAJUDICIAL' | 'PASTA_JURIDICA';

export interface GeneralSettingsDTO {
  fusoHorario: string;
  idioma: string;
  formatoData: string;
  moedaPadrao: string;
  diaInicioSemana: number;
  notificacoesPadrao: boolean;
}

export interface FinancialSettingsDTO {
  formaCalculoHonorarioPadrao: string;
  percentualHonorarioPadrao: number | null;
  diasVencimentoPadrao: number;
}

export interface AiSettingsDTO {
  providerPadrao: string;
  modeloPadrao: string | null;
  cotaMensalPersonalizada: number | null;
  exigirRevisaoHumana: boolean;
  providersDisponiveis: string[];
}

export interface ExtraFieldDTO {
  id: string;
  entidade: EntidadeConfiguravel;
  nome: string;
  chave: string;
  tipo: 'TEXTO' | 'NUMERO' | 'DATA' | 'BOOLEANO' | 'SELECT' | 'MULTISELECT' | 'TEXTAREA';
  obrigatorio: boolean;
  opcoes: string[];
  valorPadrao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface RequiredFieldDTO {
  entidade: EntidadeConfiguravel;
  campo: string;
  obrigatorio: boolean;
}

export interface ValueSetItemDTO {
  id: string;
  valor: string;
  ordem: number;
  ativo: boolean;
}

export interface ValueSetDTO {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  itens: ValueSetItemDTO[];
}

export interface TaskCategoryDTO {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

export interface CollaboratorGroupDTO {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  membros: Array<{ id: string; nome: string }>;
}

/**
 * Catálogo de Cargos (Sprint "Colaboradores") — mesma forma de
 * `TaskCategoryDTO`/`CollaboratorGroupDTO` acima (sem `membros`), com
 * `ordem` para permitir uma exibição customizável no `Select` de Cargo do
 * formulário de Colaborador.
 */
export interface CargoDTO {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface TaskTemplateDTO {
  id: string;
  nome: string;
  descricao: string | null;
  categoriaId: string | null;
  categoria: { id: string; nome: string; cor: string } | null;
  prazoDiasPadrao: number;
  prioridadePadrao: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  checklist: string[];
  ativo: boolean;
}

export interface HolidayDTO {
  id: string;
  nome: string;
  data: string;
  tipo: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL' | 'FORENSE' | 'PERSONALIZADO';
  uf: string | null;
  recorrenteAnual: boolean;
  ativo: boolean;
}

export interface ConfigurationDashboardSummaryDTO {
  quantidadeCamposExtra: number;
  quantidadeCategorias: number;
  quantidadeConjuntos: number;
  quantidadeModelos: number;
  quantidadeGrupos: number;
  quantidadeUsuarios: number;
  quantidadeProvidersIa: number;
  consumoIa: {
    mesReferencia: string;
    resumosGerados: number;
    cotaMensal: number | null;
    custoEstimadoCentavosTotal: number;
  };
  ultimasAlteracoes: Array<{
    id: string;
    acao: string;
    recursoTipo: string;
    recursoId: string | null;
    atorId: string | null;
    criadoEm: string;
  }>;
}

export const configurationApi = {
  dashboardSummary: () =>
    apiClient.get<ConfigurationDashboardSummaryDTO>('/configuration/dashboard-summary'),

  getGeneral: () => apiClient.get<GeneralSettingsDTO>('/configuration/general'),
  updateGeneral: (input: Partial<GeneralSettingsDTO>) =>
    apiClient.patch<GeneralSettingsDTO>('/configuration/general', input),

  getFinancial: () => apiClient.get<FinancialSettingsDTO>('/configuration/financial'),
  updateFinancial: (input: Partial<FinancialSettingsDTO>) =>
    apiClient.patch<FinancialSettingsDTO>('/configuration/financial', input),

  getAi: () => apiClient.get<AiSettingsDTO>('/configuration/ai'),
  updateAi: (input: Partial<Omit<AiSettingsDTO, 'providersDisponiveis'>>) =>
    apiClient.patch<AiSettingsDTO>('/configuration/ai', input),

  listExtraFields: (entidade?: EntidadeConfiguravel) =>
    apiClient.get<ExtraFieldDTO[]>('/configuration/extra-fields', { query: { entidade } }),
  createExtraField: (input: Omit<ExtraFieldDTO, 'id' | 'ativo'>) =>
    apiClient.post<{ id: string }>('/configuration/extra-fields', input),
  updateExtraField: (
    id: string,
    input: Partial<Omit<ExtraFieldDTO, 'id' | 'entidade' | 'chave'>>,
  ) => apiClient.patch<void>(`/configuration/extra-fields/${id}`, input),
  deleteExtraField: (id: string) => apiClient.delete<void>(`/configuration/extra-fields/${id}`),

  listRequiredFields: (entidade?: EntidadeConfiguravel) =>
    apiClient.get<RequiredFieldDTO[]>('/configuration/required-fields', { query: { entidade } }),
  bulkUpdateRequiredFields: (itens: RequiredFieldDTO[]) =>
    apiClient.patch<RequiredFieldDTO[]>('/configuration/required-fields', { itens }),

  listValueSets: () => apiClient.get<ValueSetDTO[]>('/configuration/value-sets'),
  createValueSet: (input: { nome: string; descricao?: string }) =>
    apiClient.post<{ id: string }>('/configuration/value-sets', input),
  updateValueSet: (id: string, input: { nome?: string; descricao?: string; ativo?: boolean }) =>
    apiClient.patch<void>(`/configuration/value-sets/${id}`, input),
  deleteValueSet: (id: string) => apiClient.delete<void>(`/configuration/value-sets/${id}`),
  addValueSetItem: (conjuntoId: string, input: { valor: string; ordem?: number }) =>
    apiClient.post<{ id: string }>(`/configuration/value-sets/${conjuntoId}/items`, input),
  removeValueSetItem: (conjuntoId: string, itemId: string) =>
    apiClient.delete<void>(`/configuration/value-sets/${conjuntoId}/items/${itemId}`),

  listTaskCategories: () => apiClient.get<TaskCategoryDTO[]>('/configuration/task-categories'),
  createTaskCategory: (input: { nome: string; cor?: string }) =>
    apiClient.post<{ id: string }>('/configuration/task-categories', input),
  updateTaskCategory: (id: string, input: Partial<Omit<TaskCategoryDTO, 'id'>>) =>
    apiClient.patch<void>(`/configuration/task-categories/${id}`, input),
  deleteTaskCategory: (id: string) =>
    apiClient.delete<void>(`/configuration/task-categories/${id}`),

  listCollaboratorGroups: () =>
    apiClient.get<CollaboratorGroupDTO[]>('/configuration/collaborator-groups'),
  createCollaboratorGroup: (input: { nome: string; descricao?: string }) =>
    apiClient.post<{ id: string }>('/configuration/collaborator-groups', input),
  updateCollaboratorGroup: (
    id: string,
    input: { nome?: string; descricao?: string; ativo?: boolean },
  ) => apiClient.patch<void>(`/configuration/collaborator-groups/${id}`, input),
  deleteCollaboratorGroup: (id: string) =>
    apiClient.delete<void>(`/configuration/collaborator-groups/${id}`),
  addCollaboratorGroupMember: (grupoId: string, membroId: string) =>
    apiClient.post<void>(`/configuration/collaborator-groups/${grupoId}/members`, { membroId }),
  removeCollaboratorGroupMember: (grupoId: string, membroId: string) =>
    apiClient.delete<void>(`/configuration/collaborator-groups/${grupoId}/members/${membroId}`),

  listTaskTemplates: () => apiClient.get<TaskTemplateDTO[]>('/configuration/task-templates'),
  createTaskTemplate: (input: {
    nome: string;
    categoriaId?: string;
    prazoDiasPadrao: number;
    prioridadePadrao: TaskTemplateDTO['prioridadePadrao'];
    checklist: string[];
  }) => apiClient.post<{ id: string }>('/configuration/task-templates', input),
  updateTaskTemplate: (id: string, input: Partial<Omit<TaskTemplateDTO, 'id' | 'categoria'>>) =>
    apiClient.patch<void>(`/configuration/task-templates/${id}`, input),
  deleteTaskTemplate: (id: string) => apiClient.delete<void>(`/configuration/task-templates/${id}`),

  listCargos: () => apiClient.get<CargoDTO[]>('/configuration/cargos'),
  createCargo: (input: { nome: string; descricao?: string; ordem?: number }) =>
    apiClient.post<{ id: string }>('/configuration/cargos', input),
  updateCargo: (id: string, input: Partial<Omit<CargoDTO, 'id'>>) =>
    apiClient.patch<void>(`/configuration/cargos/${id}`, input),
  deleteCargo: (id: string) => apiClient.delete<void>(`/configuration/cargos/${id}`),

  listHolidays: () => apiClient.get<HolidayDTO[]>('/configuration/holidays'),
  createHoliday: (input: {
    nome: string;
    data: string;
    tipo: HolidayDTO['tipo'];
    uf?: string;
    recorrenteAnual: boolean;
  }) => apiClient.post<{ id: string }>('/configuration/holidays', input),
  updateHoliday: (id: string, input: Partial<Omit<HolidayDTO, 'id'>>) =>
    apiClient.patch<void>(`/configuration/holidays/${id}`, input),
  deleteHoliday: (id: string) => apiClient.delete<void>(`/configuration/holidays/${id}`),
};
