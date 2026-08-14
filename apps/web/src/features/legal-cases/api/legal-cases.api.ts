import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/legal-cases/` — mesma
 * pendência de `openapi-typescript` de docs/frontend-implementation/19-decisions.md
 * §19.2. Módulo real nesta rodada (Prompt 7).
 */
export type LegalCaseStatus = 'ATIVO' | 'SUSPENSO' | 'ARQUIVADO' | 'ENCERRADO';
export type LegalCasePriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type LegalCaseType = 'JUDICIAL' | 'ADMINISTRATIVO' | 'CONSULTIVO' | 'EXTRAJUDICIAL';
export type LegalCasePolo = 'ATIVO' | 'PASSIVO' | 'TERCEIRO';
export type LegalCaseInstancia = 'PRIMEIRA' | 'SEGUNDA' | 'SUPERIOR';

export interface LegalCaseSummaryDTO {
  id: string;
  titulo: string;
  numeroInterno: string | null;
  instituicao?: string | null;
  numeroBeneficio?: string | null;
  numeroCnj: string | null;
  status: LegalCaseStatus;
  prioridade: LegalCasePriority;
  area: string;
  tribunal: string | null;
  comarca: string | null;
  vara?: string | null;
  instancia?: LegalCaseInstancia | null;
  tipoAcao?: string | null;
  poloCliente?: LegalCasePolo;
  dataDistribuicao?: string | null;
  dataEncerramento?: string | null;
  segredoJustica: boolean;
  cliente: { id: string; nome: string };
  pastaJuridica: {
    id: string;
    nome: string;
    clientePrincipal?: { id: string; nome: string };
    parteContrariaPrincipal?: { id: string; nome: string } | null;
    encarregado?: { id: string; usuario: { nome: string } } | null;
  } | null;
  autorPrincipal: { id: string; nome: string; clienteId: string | null } | null;
  reuPrincipal: { id: string; nome: string; clienteId: string | null } | null;
  advogadoPrincipalAutor?: { id: string; nome: string; clienteId: string | null } | null;
  advogadoPrincipalReu?: { id: string; nome: string; clienteId: string | null } | null;
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
  proximaDataRelevante: string | null;
  ultimaAtualizacaoEm: string;
  versao: number;
}

export interface LegalCaseDetailDTO {
  id: string;
  titulo: string;
  descricao: string | null;
  numeroCnj: string | null;
  numeroInterno: string | null;
  instituicao?: string | null;
  numeroBeneficio?: string | null;
  roNumeroBeneficio?: string | null;
  area: string;
  tipoAcao: string | null;
  tipo: LegalCaseType;
  tribunal: string | null;
  comarca: string | null;
  vara: string | null;
  uf: string | null;
  instancia: LegalCaseInstancia | null;
  classeProcessual: string | null;
  assunto: string | null;
  poloCliente: LegalCasePolo;
  status: LegalCaseStatus;
  prioridade: LegalCasePriority;
  segredoJustica: boolean;
  valorCausaCentavos: string | null;
  moedaValorCausa: string;
  dataDistribuicao: string | null;
  dataEncerramento: string | null;
  cliente: { id: string; nome: string; tipo: string };
  pastaJuridica: {
    id: string;
    nome: string;
    numeroInterno: string | null;
    clientePrincipal: { id: string; nome: string };
    parteContrariaPrincipal: { id: string; nome: string } | null;
    encarregado: { id: string; nome: string } | null;
  } | null;
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
  proximaDataRelevante: string | null;
  observacoes: string | null;
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
  arquivadoEm: string | null;
  resumoIaVigente: unknown | null;
  tagsAtivas: Array<{ id: string; nome: string; cor: string }>;
}

export interface ListLegalCasesParams {
  status?: LegalCaseStatus;
  tipo?: LegalCaseType;
  pastaJuridicaId?: string;
  responsavelId?: string;
  clienteId?: string;
  area?: string;
  tribunal?: string;
  prioridade?: LegalCasePriority;
  dataDistribuicaoDe?: string;
  dataDistribuicaoAte?: string;
  dataEncerramentoDe?: string;
  dataEncerramentoAte?: string;
  protocolo?: string;
  parteId?: string;
  parteContrariaId?: string;
  encarregadoId?: string;
  semMovimentacoesApos?: string;
  meusApenas?: boolean;
  q?: string;
  sort?:
    | '-ultimaAtualizacaoEm'
    | 'ultimaAtualizacaoEm'
    | 'titulo'
    | '-titulo'
    | 'dataDistribuicao'
    | '-dataDistribuicao';
  cursor?: string;
  limit?: number;
}

export interface ListLegalCasesResult {
  items: LegalCaseSummaryDTO[];
  nextCursor: string | null;
  total: number;
}

export interface UpsertLegalCaseInput {
  pastaJuridicaId?: string;
  titulo?: string;
  clienteId?: string;
  numeroCnj?: string;
  numeroInterno?: string;
  instituicao?: string | null;
  numeroBeneficio?: string | null;
  roNumeroBeneficio?: string | null;
  area?: string;
  tipoAcao?: string;
  tipo?: LegalCaseType;
  tribunal?: string;
  comarca?: string;
  vara?: string;
  uf?: string;
  instancia?: LegalCaseInstancia;
  classeProcessual?: string;
  assunto?: string;
  poloCliente?: LegalCasePolo;
  status?: LegalCaseStatus;
  prioridade?: LegalCasePriority;
  segredoJustica?: boolean;
  valorCausaCentavos?: number;
  dataDistribuicao?: string;
  dataEncerramento?: string | null;
  responsavelPrincipalId?: string;
  descricao?: string;
  observacoes?: string;
}

export interface CaseTeamMemberDTO {
  id: string;
  membroId: string;
  nome: string | null;
  avatarUrl: string | null;
  funcaoNoProcesso: string | null;
  responsavelPrincipal: boolean;
  acessoPermitido: 'LEITURA' | 'LEITURA_ESCRITA';
  entrouEm: string;
}

export interface CasePartyDTO {
  id: string;
  tipo: string;
  natureza: string;
  nome: string;
  documento: string | null;
  clienteId: string | null;
  oabNumero: string | null;
  oabUf: string | null;
  observacoes: string | null;
  principal?: boolean;
}

export interface ExtrajudicialAggregateInput {
  processo: {
    numeroInterno: string;
    instituicao: string | null;
    dataDistribuicao: string;
    dataEncerramento: string | null;
    status: LegalCaseStatus;
    observacoes: string | null;
    numeroBeneficio: string | null;
  };
  partes: Array<{ id?: string; clienteId?: string | null; tipo: string; principal: boolean }>;
}

export interface JudicialAggregateInput {
  processo: {
    numeroCnj: string;
    tribunal: string | null;
    comarca: string | null;
    vara: string | null;
    tipoAcao: string | null;
    area: string;
    poloCliente: LegalCasePolo;
    instancia: LegalCaseInstancia;
    dataDistribuicao: string;
    dataEncerramento: string | null;
    status: LegalCaseStatus;
    observacoes: string | null;
    numeroBeneficio: string | null;
    roNumeroBeneficio: string | null;
  };
  partes: Array<{ id?: string; clienteId?: string | null; tipo: string; principal: boolean }>;
}

export interface CaseDeadlineDTO {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  dataVencimento: string;
  responsavelId: string;
  prioridade: LegalCasePriority;
  status: string;
  motivoCancelamento: string | null;
}

export const legalCasesApi = {
  list: (params: ListLegalCasesParams = {}) =>
    apiClient.get<ListLegalCasesResult>('/legal-cases', { query: { ...params } }),

  create: (input: UpsertLegalCaseInput) => apiClient.post<{ id: string }>('/legal-cases', input),

  get: (id: string) => apiClient.get<LegalCaseDetailDTO>(`/legal-cases/${id}`),

  partyOptions: (params: { q?: string; tipo?: 'TODAS' | 'REU'; cursor?: string; limit?: number }) =>
    apiClient.get<{
      items: Array<{ id: string; nome: string; tipo: string; documento: string | null }>;
      nextCursor: string | null;
    }>('/legal-cases/party-options', { query: params }),

  update: (id: string, versaoAtual: number, input: UpsertLegalCaseInput) =>
    apiClient.patch<{ versao: number }>(`/legal-cases/${id}`, input, {
      headers: { 'If-Match': String(versaoAtual) },
    }),
  updateExtrajudicial: (id: string, versaoAtual: number, input: ExtrajudicialAggregateInput) =>
    apiClient.patch<{ versao: number }>(`/legal-cases/${id}/extrajudicial`, input, {
      headers: { 'If-Match': String(versaoAtual) },
    }),
  updateJudicial: (id: string, versaoAtual: number, input: JudicialAggregateInput) =>
    apiClient.patch<{ versao: number }>(`/legal-cases/${id}/judicial`, input, {
      headers: { 'If-Match': String(versaoAtual) },
    }),

  remove: (id: string) => apiClient.delete<void>(`/legal-cases/${id}`),
  archive: (id: string) => apiClient.post<void>(`/legal-cases/${id}/archive`),
  restore: (id: string) => apiClient.post<void>(`/legal-cases/${id}/restore`),

  listTeam: (id: string) => apiClient.get<CaseTeamMemberDTO[]>(`/legal-cases/${id}/team`),
  addTeamMember: (id: string, membroId: string) =>
    apiClient.post<{ id: string }>(`/legal-cases/${id}/team`, { membroId }),
  changeResponsible: (id: string, membroId: string) =>
    apiClient.patch<void>(`/legal-cases/${id}/responsible`, { membroId }),
  removeTeamMember: (id: string, membroId: string) =>
    apiClient.delete<void>(`/legal-cases/${id}/team/${membroId}`),

  listParties: (id: string) => apiClient.get<CasePartyDTO[]>(`/legal-cases/${id}/parties`),
  updateParty: (id: string, parteId: string, input: { principal?: boolean }) =>
    apiClient.patch<void>(`/legal-cases/${id}/parties/${parteId}`, input),
  removeParty: (id: string, parteId: string) =>
    apiClient.delete<void>(`/legal-cases/${id}/parties/${parteId}`),

  listDeadlines: (id: string) => apiClient.get<CaseDeadlineDTO[]>(`/legal-cases/${id}/deadlines`),
  createDeadline: (
    id: string,
    input: {
      titulo: string;
      tipo: string;
      dataVencimento: string;
      responsavelId: string;
      prioridade?: string;
    },
  ) => apiClient.post<{ id: string }>(`/legal-cases/${id}/deadlines`, input),
};
