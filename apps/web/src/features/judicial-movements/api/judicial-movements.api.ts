import { apiClient } from '@/lib/api/client';

export interface JudicialMovement {
  id: string;
  numeroCnj: string;
  dataMovimento: string;
  capturadoEm: string;
  tipo: string;
  descricao: string;
  tribunal: string | null;
  provider: 'DATAJUD' | 'DJEN';
  origem: 'CAPTURA_JUDICIAL';
  situacao: 'NOVA' | 'REGISTRADA';
  favorita: boolean;
  lida: boolean;
  naTimeline?: boolean;
  pastaJuridica: null | { id: string; nome: string };
  tarefas: Array<{ id: string; titulo: string }>;
  processo: null | {
    id: string;
    titulo: string;
    numeroCnj?: string | null;
    cliente: { id: string; nome: string };
    pastasJuridicas: Array<{ pastaJuridica: { id: string; nome: string } }>;
    configuracoesCaptura?: Array<{ id: string; status: string }>;
  };
  publicacoes: Array<{
    id: string;
    dataPublicacao: string | null;
    tipoComunicacao: string | null;
    conteudo: string | null;
  }>;
}

export interface JudicialMovementFilters {
  q?: string;
  cnj?: string;
  processo?: string;
  cliente?: string;
  pasta?: string;
  tribunal?: string;
  tipo?: string;
  origem?: 'DATAJUD' | 'DJEN';
  responsavelId?: string;
  clientePastaId?: string;
  encarregadoPastaId?: string;
  parteContrariaPastaId?: string;
  pastaJuridicaId?: string;
  processoId?: string;
  leitura?: 'LIDA' | 'NAO_LIDA';
  tarefas?: 'COM' | 'SEM';
  timeline?: 'COM' | 'SEM';
  vinculoProcesso?: 'COM' | 'SEM';
  movimentoDe?: string;
  movimentoAte?: string;
  capturaDe?: string;
  capturaAte?: string;
  somenteNovas?: boolean;
  somenteComPublicacao?: boolean;
  somenteFavoritas?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface JudicialMovementList {
  items: JudicialMovement[];
  total: number;
  page: number;
  limit: number;
  indicators: {
    total: number;
    novas: number;
    hoje: number;
    semana: number;
    ultimaSincronizacao: string | null;
  };
}

export const judicialMovementsApi = {
  list: (query: JudicialMovementFilters) =>
    apiClient.get<JudicialMovementList>('/judicial-movements', { query: { ...query } }),
  get: (id: string) => apiClient.get<JudicialMovement>(`/judicial-movements/${id}`),
  viewed: (id: string) => apiClient.post<void>(`/judicial-movements/${id}/viewed`),
  favorite: (id: string) =>
    apiClient.post<{ favorita: boolean }>(`/judicial-movements/${id}/favorite`),
  toggleRead: (id: string) => apiClient.post<{ lida: boolean }>(`/judicial-movements/${id}/read`),
  publishToTimeline: (id: string) =>
    apiClient.post<{ lancada: boolean; duplicada: boolean }>(`/judicial-movements/${id}/timeline`),
  linkProcess: (id: string, processoId: string) =>
    apiClient.patch<JudicialMovement>(`/judicial-movements/${id}/process`, {
      body: { processoId },
    }),
  export: (query: JudicialMovementFilters) =>
    apiClient.get<{ items: Array<Record<string, unknown>>; truncado: boolean; limite: number }>(
      '/judicial-movements/export',
      { query: { ...query } },
    ),
};
