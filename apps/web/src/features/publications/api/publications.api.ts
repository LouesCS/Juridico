import { apiClient } from '@/lib/api/client';
export type PublicationSituation = 'NOVA' | 'LIDA' | 'PENDENTE';
export interface Publication {
  id: string;
  numeroCnj: string;
  dataPublicacao: string | null;
  dataDisponibilizacao: string | null;
  tipoComunicacao: string | null;
  conteudo: string | null;
  tribunal: string | null;
  provider: string;
  capturadoEm: string;
  lida: boolean;
  favorita: boolean;
  situacao: PublicationSituation;
  processo: null | {
    id: string;
    titulo: string;
    cliente: { id: string; nome: string };
    pastas: Array<{ id: string; nome: string }>;
    configuracoesCaptura?: Array<{ id: string; status: string }>;
  };
  movimentoRelacionado: null | {
    id: string;
    dataMovimento: string;
    descricao: string;
    tipo: string;
  };
}
export interface PublicationFilters {
  q?: string;
  cnj?: string;
  processo?: string;
  processoId?: string;
  cliente?: string;
  tribunal?: string;
  tipo?: string;
  situacao?: PublicationSituation;
  publicacaoDe?: string;
  publicacaoAte?: string;
  cadastroDe?: string;
  cadastroAte?: string;
  responsavelId?: string;
  somenteNovas?: boolean;
  somenteNaoLidas?: boolean;
  somenteComMovimentacao?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}
export interface PublicationList {
  items: Publication[];
  total: number;
  page: number;
  limit: number;
  indicators: {
    total: number;
    novas: number;
    lidas: number;
    pendentes: number;
    ultimaSincronizacao: string | null;
  };
}
export const publicationsApi = {
  list: (q: PublicationFilters) =>
    apiClient.get<PublicationList>('/publications', { query: { ...q } }),
  get: (id: string) => apiClient.get<Publication>(`/publications/${id}`),
  viewed: (id: string) => apiClient.post<void>(`/publications/${id}/viewed`),
  read: (id: string) => apiClient.post<{ lida: boolean }>(`/publications/${id}/read`),
  favorite: (id: string) => apiClient.post<{ favorita: boolean }>(`/publications/${id}/favorite`),
  remove: (id: string) => apiClient.delete<void>(`/publications/${id}`),
  export: (q: PublicationFilters) =>
    apiClient.get<{ items: Array<Record<string, unknown>>; truncado: boolean; limite: number }>(
      '/publications/export',
      { query: { ...q } },
    ),
};
