import { apiClient } from '@/lib/api/client';
export interface ExtraMovement {
  id: string;
  dataMovimentacao: string;
  cliente: { id: string; nome: string };
  processo: { id: string; titulo: string; numeroCnj?: string | null } | null;
  pasta: { id: string; nome: string } | null;
  pastaJuridica: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string };
  tipo: string;
  origem: string;
  status: string;
  descricao: string;
  observacoes: string | null;
  camposExtrasValores: Record<string, string>;
  favorita: boolean;
  lida: boolean;
  tarefas: Array<{ id: string; titulo: string }>;
  naTimeline?: boolean;
  anexos?: Array<{ id: string; nome: string; extensao: string }>;
  criadoEm: string;
  atualizadoEm: string;
}
export interface Body {
  dataMovimentacao: string;
  clienteId?: string;
  processoId?: string;
  pastaId?: string;
  pastaJuridicaId?: string | null;
  responsavelId: string;
  tipo: string;
  origem: string;
  status: string;
  descricao: string;
  observacoes?: string;
  camposExtrasValores?: Record<string, string>;
}
export const extraMovementsApi = {
  list: (q: Record<string, string | number | boolean | null | undefined>) =>
    apiClient.get<{
      items: ExtraMovement[];
      total: number;
      page: number;
      limit: number;
      indicators: {
        total: number;
        hoje: number;
        semana: number;
        pendentes: number;
        favoritas: number;
      };
    }>('/extrajudicial-movements', { query: q }),
  get: (id: string) => apiClient.get<ExtraMovement>(`/extrajudicial-movements/${id}`),
  catalogs: () =>
    apiClient.get<{
      tipos: string[];
      origens: string[];
      status: string[];
      camposExtras: Array<{
        id: string;
        nome: string;
        obrigatorio: boolean;
        valorPadrao: string | null;
      }>;
    }>('/extrajudicial-movements/catalogs'),
  create: (b: Body) => apiClient.post<ExtraMovement>('/extrajudicial-movements', { body: b }),
  update: (id: string, b: Partial<Body>) =>
    apiClient.patch<ExtraMovement>(`/extrajudicial-movements/${id}`, { body: b }),
  remove: (id: string) => apiClient.delete<void>(`/extrajudicial-movements/${id}`),
  favorite: (id: string) =>
    apiClient.post<{ favorita: boolean }>(`/extrajudicial-movements/${id}/favorite`),
  toggleRead: (id: string) =>
    apiClient.post<{ lida: boolean }>(`/extrajudicial-movements/${id}/read`),
  publishToTimeline: (id: string) =>
    apiClient.post<{ lancada: boolean; duplicada: boolean }>(`/extrajudicial-movements/${id}/timeline`),
  export: (q: Record<string, string | number | boolean | null | undefined>) =>
    apiClient.get<{ items: Array<Record<string, unknown>> }>('/extrajudicial-movements/export', {
      query: q,
    }),
};
