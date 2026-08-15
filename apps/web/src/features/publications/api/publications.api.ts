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
  diario: string | null;
  cidade: string | null;
  orgao: string | null;
  vara: string | null;
  nomeVinculo: string | null;
  oculta: boolean;
  provider: string;
  capturadoEm: string;
  lida: boolean;
  favorita: boolean;
  situacao: PublicationSituation;
  tarefasTotal: number;
  pastaJuridica: null | {
    id: string;
    nome: string;
    numeroInterno: string | null;
    confidencial: boolean;
  };
  configuracaoCaptura: null | {
    id: string;
    numeroCnj: string;
    processoId: string | null;
    pastaJuridicaId: string | null;
  };
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
  cidade?: string;
  diario?: string;
  nomeVinculo?: string;
  orgao?: string;
  vara?: string;
  pastaId?: string;
  clientePastaId?: string;
  encarregadoPastaId?: string;
  parteContrariaPastaId?: string;
  vinculoTarefa?: 'COM' | 'SEM';
  timeline?: 'COM' | 'SEM';
  vinculoPasta?: 'COM' | 'SEM';
  visualizacao?: 'OCULTAS' | 'NAO_OCULTAS';
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
  link: (id: string, input: { pastaJuridicaId: string; processoId?: string | null }) =>
    apiClient.patch<void>(`/publications/${id}/link`, input),
  toggleHidden: (id: string) =>
    apiClient.post<{ oculta: boolean }>(`/publications/${id}/visibility`),
  remove: (id: string) => apiClient.delete<void>(`/publications/${id}`),
  export: (q: PublicationFilters) =>
    apiClient.get<{ items: Array<Record<string, unknown>>; truncado: boolean; limite: number }>(
      '/publications/export',
      { query: { ...q } },
    ),
};
