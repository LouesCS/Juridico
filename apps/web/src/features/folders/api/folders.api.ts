import { apiClient } from '@/lib/api/client';

export interface FolderDTO {
  id: string;
  nome: string;
  pastaPaiId: string | null;
  processoId: string | null;
  ordem: number;
  totalDocumentos: number;
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ListFoldersParams {
  processoId?: string;
  q?: string;
}

export interface CreateFolderInput {
  nome: string;
  processoId?: string;
  pastaPaiId?: string;
}

export interface UpdateFolderInput {
  nome?: string;
  pastaPaiId?: string | null;
}

export const foldersApi = {
  list: (params: ListFoldersParams = {}) => apiClient.get<FolderDTO[]>('/folders', { query: { ...params } }),

  create: (input: CreateFolderInput) => apiClient.post<{ id: string }>('/folders', input),

  update: (id: string, input: UpdateFolderInput) => apiClient.patch<void>(`/folders/${id}`, input),

  reorder: (id: string, ordem: number) => apiClient.patch<void>(`/folders/${id}/reorder`, { ordem }),

  remove: (id: string, cascata = false) =>
    apiClient.delete<void>(`/folders/${id}`, undefined, { query: { cascata } }),

  restore: (id: string) => apiClient.post<void>(`/folders/${id}/restore`),

  toggleFavorite: (id: string) => apiClient.post<{ favorito: boolean }>(`/folders/${id}/favorite`),
};
