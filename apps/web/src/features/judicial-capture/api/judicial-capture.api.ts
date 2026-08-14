import { apiClient } from '@/lib/api/client';

export type CaptureStatus = 'ATIVA' | 'PAUSADA' | 'SINCRONIZANDO' | 'ERRO';
export interface CaptureConfiguration {
  id: string;
  numeroCnj: string;
  capturaAtiva: boolean;
  status: CaptureStatus;
  ultimoResultado: string | null;
  ultimaSincronizacaoEm: string | null;
  proximaSincronizacaoEm: string | null;
  novidadesUltimaCaptura: number;
  ultimoErroPublico: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pasta?: { id: string; nome: string } | null;
  processo: null | {
    id: string;
    titulo: string;
    numeroCnj?: string | null;
    numeroInterno?: string | null;
    assunto?: string | null;
    cliente: { id: string; nome: string };
    responsavelPrincipal?: { id: string; nome: string } | null;
    partes?: Array<{ id: string; nome: string; natureza: string; ehNossoCliente?: boolean }>;
    pastasJuridicas?: Array<{ pastaJuridica: { id: string; nome: string } }>;
  };
  historicos?: Array<{
    id: string;
    provider: string;
    resultado: string;
    novidades: number;
    erroPublico: string | null;
    criadoEm: string;
  }>;
}
export interface CaptureList {
  items: CaptureConfiguration[];
  total: number;
  page: number;
  limit: number;
}
export interface VerifyResult {
  found: boolean;
  process: null | {
    numeroCnj: string;
    tribunal?: string;
    orgaoJulgador?: string;
    classe?: string;
    ultimaMovimentacao?: string;
  };
  processoRelacionado: CaptureConfiguration['processo'];
}
export interface CaptureFilters {
  q?: string;
  cnj?: string;
  processo?: string;
  cliente?: string;
  pastaJuridicaId?: string;
  status?: string;
  ativa?: boolean;
  criadoDe?: string;
  criadoAte?: string;
  atualizadoDe?: string;
  atualizadoAte?: string;
  ultimaSincronizacaoDe?: string;
  ultimaSincronizacaoAte?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
export const judicialCaptureApi = {
  list: (query: CaptureFilters) =>
    apiClient.get<CaptureList>('/capture-configurations', { query: { ...query } }),
  get: (id: string) => apiClient.get<CaptureConfiguration>(`/capture-configurations/${id}`),
  verify: (numeroCnj: string) =>
    apiClient.post<VerifyResult>('/capture-configurations/verify', { numeroCnj }),
  create: (input: { numeroCnj: string; processoId?: string | null; capturaAtiva: boolean }) =>
    apiClient.post<CaptureConfiguration>('/capture-configurations', input),
  update: (
    id: string,
    input: { numeroCnj?: string; processoId?: string | null; capturaAtiva?: boolean },
  ) => apiClient.patch<CaptureConfiguration>(`/capture-configurations/${id}`, input),
  sync: (id: string) =>
    apiClient.post<{ novidades: number; resultado: string }>(`/capture-configurations/${id}/sync`),
  remove: (id: string) => apiClient.delete<void>(`/capture-configurations/${id}`),
};
