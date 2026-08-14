import { apiClient } from '@/lib/api/client';
export interface RequestDTO {
  id: string;
  descricao: string;
  categoria: string;
  situacao: string;
  dataFinalizacao: string | null;
  estimativaExito: string | null;
  valorPedidoCentavos: string | null;
  valorProvavelCentavos: string | null;
  valorPossivelCentavos: string | null;
  valorRemotoCentavos: string | null;
  valorFinalCentavos: string | null;
  anotacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pastaJuridica: { id: string; nome: string; clientePrincipal: { id: string; nome: string } };
  processo: {
    id: string;
    titulo: string;
    numeroCnj: string | null;
    tipo: 'JUDICIAL' | 'EXTRAJUDICIAL';
  } | null;
}
export interface RequestBody {
  pastaJuridicaId: string;
  processoId?: string | null;
  descricao: string;
  categoria: string;
  situacao: string;
  dataFinalizacao?: string | null;
  estimativaExito?: number | null;
  valorPedidoCentavos?: string | null;
  valorProvavelCentavos?: string | null;
  valorPossivelCentavos?: string | null;
  valorRemotoCentavos?: string | null;
  valorFinalCentavos?: string | null;
  anotacoes?: string | null;
}
export type RequestQuery = Record<string, string | number | undefined | null>;
export const requestsApi = {
  list: (q: RequestQuery) =>
    apiClient.get<{ items: RequestDTO[]; total: number; page: number; limit: number }>(
      '/requests',
      { query: q },
    ),
  export: (q: RequestQuery) =>
    apiClient.get<{ items: Array<Record<string, unknown>>; total: number }>('/requests/export', {
      query: q,
    }),
  get: (id: string) => apiClient.get<RequestDTO>(`/requests/${id}`),
  options: () =>
    apiClient.get<{
      categorias: { value: string; label: string }[];
      situacoes: { value: string; label: string }[];
    }>('/requests/options'),
  create: (b: RequestBody) => apiClient.post<RequestDTO>('/requests', { body: b }),
  update: (id: string, b: Partial<RequestBody>) =>
    apiClient.patch<RequestDTO>(`/requests/${id}`, { body: b }),
  remove: (id: string) => apiClient.delete<void>(`/requests/${id}`),
};
