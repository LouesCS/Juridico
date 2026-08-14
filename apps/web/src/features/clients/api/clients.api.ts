import { apiClient } from '@/lib/api/client';
import type { TimelineItemDTO } from '@/features/timeline';

/**
 * Tipos manuais espelhando `apps/api/src/modules/clients/` campo a campo —
 * mesma pendência de geração via `openapi-typescript` de
 * docs/frontend-implementation/19-decisions.md §19.2. Ampliado no Sprint
 * "Clientes e Contatos" — `categoriaRelacionamento`/campos pessoais/
 * favorito/campos extras/exportar/timeline.
 */
export type ClientType = 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
export type ClientMaritalStatus = 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';

export interface ClientSummaryDTO {
  id: string;
  nome: string;
  tipo: ClientType;
  avatarUrl: string | null;
  documento: string | null;
  emails: string[];
  telefones: string[];
  processosAtivos: number;
  responsavel: { id: string; nome: string } | null;
  favorito: boolean;
  criadoEm: string;
  ultimaMovimentacaoEm: string;
}

export interface ClientDetailDTO {
  id: string;
  tipo: ClientType;
  nome: string;
  nomeSocial: string | null;
  razaoSocial: string | null;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  emails: string[];
  telefones: string[];
  telefoneResidencial: string | null;
  telefoneResponsavel: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
  enderecoCep: string | null;
  observacoes: string | null;
  responsavel: { id: string; nome: string } | null;
  responsavelNome: string | null;
  avatarUrl: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  estadoCivil: ClientMaritalStatus | null;
  profissao: string | null;
  dataNascimento: string | null;
  camposExtrasValores: Record<string, string>;
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
  processosAtivos: number;
  documentosCount: number;
}

export interface ClientLegalCaseSummaryDTO {
  id: string;
  titulo: string;
  numeroCnj: string | null;
  status: string;
  prioridade: string;
  proximaDataRelevante: string | null;
  versao: number;
}

export interface ClientExportRowDTO {
  id: string;
  nome: string;
  tipo: ClientType;
  documento: string | null;
  email: string;
  telefone: string;
  celular: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ListClientsParams {
  q?: string;
  nome?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
  tipo?: ClientType;
  responsavelId?: string;
  nomeMae?: string;
  nomePai?: string;
  estadoCivil?: ClientMaritalStatus;
  profissao?: string;
  diaNascimento?: number;
  mesNascimento?: number;
  anoNascimento?: number;
  dataCadastro?: string;
  periodoCadastroInicio?: string;
  periodoCadastroFim?: string;
  ultimaAlteracao?: string;
  sort?: 'nome' | '-nome' | '-criadoEm' | 'criadoEm' | 'atualizadoEm' | '-atualizadoEm';
  cursor?: string;
  limit?: number;
}

export type ExportClientsParams = Omit<ListClientsParams, 'cursor' | 'limit'>;

export interface ListClientsResult {
  items: ClientSummaryDTO[];
  nextCursor: string | null;
}

export interface ClientWarning {
  codigo: 'DUPLICATE_DOCUMENT';
  clienteExistenteId: string;
}

export interface UpsertClientInput {
  tipo?: ClientType;
  nome?: string;
  nomeSocial?: string;
  razaoSocial?: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  emails?: string[];
  telefones?: string[];
  telefoneResidencial?: string;
  telefoneResponsavel?: string;
  enderecoLogradouro?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoUf?: string;
  enderecoCep?: string;
  observacoes?: string;
  responsavelId?: string;
  responsavelNome?: string;
  avatarUrl?: string;
  nomeMae?: string;
  nomePai?: string;
  estadoCivil?: ClientMaritalStatus;
  profissao?: string;
  dataNascimento?: string;
  camposExtrasValores?: Record<string, string>;
}

export const clientsApi = {
  list: (params: ListClientsParams = {}) =>
    apiClient.get<ListClientsResult>('/clients', { query: { ...params } }),

  export: (params: ExportClientsParams = {}) =>
    apiClient.get<{ items: ClientExportRowDTO[]; truncado: boolean; limite: number }>(
      '/clients/export',
      {
        query: { ...params },
      },
    ),

  create: (input: UpsertClientInput) =>
    apiClient.post<{ cliente: { id: string }; avisos: ClientWarning[] }>('/clients', input),

  get: (id: string) => apiClient.get<ClientDetailDTO>(`/clients/${id}`),

  update: (id: string, input: UpsertClientInput) =>
    apiClient.patch<{ avisos: ClientWarning[] }>(`/clients/${id}`, input),

  remove: (id: string) => apiClient.delete<void>(`/clients/${id}`),

  archive: (id: string) => apiClient.post<void>(`/clients/${id}/archive`),

  restore: (id: string) => apiClient.post<void>(`/clients/${id}/restore`),

  duplicate: (id: string) => apiClient.post<{ id: string }>(`/clients/${id}/duplicate`),

  toggleFavorite: (id: string) => apiClient.post<{ favorito: boolean }>(`/clients/${id}/favorite`),

  listTimeline: (
    id: string,
    params: { tipo?: string; q?: string; cursor?: string; limit?: number } = {},
  ) =>
    apiClient.get<{ items: TimelineItemDTO[]; nextCursor: string | null }>(
      `/clients/${id}/timeline`,
      {
        query: { ...params },
      },
    ),

  listLegalCases: (id: string) =>
    apiClient.get<ClientLegalCaseSummaryDTO[]>(`/clients/${id}/legal-cases`),
};
