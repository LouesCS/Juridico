import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando o contrato do módulo `memberships` ampliado
 * (Sprint "Colaboradores") — mesma pendência de geração via
 * `openapi-typescript` já registrada em
 * docs/frontend-implementation/19-decisions.md §19.2. Complementa
 * `team.api.ts` (que continua servindo `useMembers`/`useInvitations`/
 * `useRoles`, consumidos por outras features) sem alterar nada lá.
 */
export type CollaboratorStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO';

export type SituacaoAcesso =
  | 'DESBLOQUEADO'
  | 'BLOQUEADO'
  | 'SUSPENSO'
  | 'CONVITE_PENDENTE'
  | 'SEM_ACESSO'
  | 'INATIVO';

export type AcessoFiltro = 'todos' | 'com_acesso' | 'sem_acesso';

export type SituacaoFiltro =
  | 'todos'
  | 'desbloqueado'
  | 'bloqueado'
  | 'suspenso'
  | 'convite_pendente'
  | 'inativo';

export type CollaboratorSort =
  | 'nome_asc'
  | 'nome_desc'
  | 'cargo_asc'
  | 'cargo_desc'
  | 'nascimento_asc'
  | 'nascimento_desc'
  | 'cadastro_asc'
  | 'cadastro_desc'
  | 'alteracao_asc'
  | 'alteracao_desc';

/**
 * `papel` modelado como nullable aqui — desvio deliberado do contrato
 * (que o lista sem `| null`): um colaborador `temAcesso: false` (cadastro
 * puro de RH) não tem papel de sistema nenhum atribuído. Reportado como
 * discrepância a validar contra o `apps/api` real.
 */
export interface CollaboratorListItemDTO {
  id: string;
  nome: string;
  nomeSocial: string | null;
  fotoUrl: string | null;
  cpf: string | null;
  email: string;
  telefone: string | null;
  celular: string | null;
  dataNascimento: string | null;
  cargo: { id: string; nome: string } | null;
  grupos: { id: string; nome: string }[];
  papel: { id: string; nome: string } | null;
  temAcesso: boolean;
  situacaoAcesso: SituacaoAcesso;
  status: CollaboratorStatus;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CollaboratorAddressDTO {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
}

export interface CollaboratorDetailDTO extends CollaboratorListItemDTO {
  rg: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  anotacoes: string | null;
  whatsapp: string | null;
  endereco: CollaboratorAddressDTO;
  departamento: string | null;
  numeroOab: string | null;
  ufOab: string | null;
  situacaoOab: string | null;
  observacaoOab: string | null;
  dataEntrada: string | null;
  responsavel: { id: string; nome: string } | null;
  entrouEm: string | null;
}

export interface CollaboratorFiltersInput {
  q?: string;
  nome?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  grupoId?: string;
  cargoId?: string;
  acesso?: AcessoFiltro;
  situacao?: SituacaoFiltro;
  nascimentoDia?: number;
  nascimentoMes?: number;
  nascimentoAno?: number;
  nascimentoDe?: string;
  nascimentoAte?: string;
  cadastroDe?: string;
  cadastroAte?: string;
  alteracaoDe?: string;
  alteracaoAte?: string;
  sort?: CollaboratorSort;
  cursor?: string;
  limit?: number;
}

export interface ListCollaboratorsResult {
  items: CollaboratorListItemDTO[];
  nextCursor: string | null;
  total: number;
}

export interface CollaboratorAddressInput {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export interface CreateCollaboratorInput {
  nome: string;
  email: string;
  nomeSocial?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  profissao?: string;
  nomeMae?: string;
  nomePai?: string;
  anotacoes?: string;
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  endereco?: CollaboratorAddressInput;
  cargoId?: string;
  departamento?: string;
  numeroOab?: string;
  ufOab?: string;
  situacaoOab?: string;
  observacaoOab?: string;
  dataEntrada?: string;
  responsavelId?: string;
  grupoIds?: string[];
  comAcesso: boolean;
  papelId?: string;
  fotoUrl?: string;
}

export type UpdateCollaboratorInput = Omit<CreateCollaboratorInput, 'comAcesso' | 'papelId'>;

export interface GrantAccessInput {
  email?: string;
  papelId: string;
}

export const collaboratorsApi = {
  list: (params: CollaboratorFiltersInput = {}) =>
    apiClient.get<ListCollaboratorsResult>('/members', { query: { ...params } }),

  get: (id: string) => apiClient.get<CollaboratorDetailDTO>(`/members/${id}`),

  create: (input: CreateCollaboratorInput) => apiClient.post<{ id: string }>('/members', input),

  update: (id: string, input: UpdateCollaboratorInput) =>
    apiClient.patch<void>(`/members/${id}`, input),

  block: (id: string) => apiClient.post<void>(`/members/${id}/block`),

  unblock: (id: string) => apiClient.post<void>(`/members/${id}/unblock`),

  suspend: (id: string) => apiClient.post<void>(`/members/${id}/suspend`),

  unsuspend: (id: string) => apiClient.post<void>(`/members/${id}/unsuspend`),

  grantAccess: (id: string, input: GrantAccessInput) =>
    apiClient.post<void>(`/members/${id}/grant-access`, input),

  revokeAccess: (id: string) => apiClient.post<void>(`/members/${id}/revoke-access`),

  revokeAllSessions: (id: string) => apiClient.delete<void>(`/members/${id}/sessions`),
};
