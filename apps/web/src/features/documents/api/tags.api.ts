import { apiClient } from '@/lib/api/client';
import type { DocumentTagDTO } from './documents.api';

export const tagsApi = {
  list: () => apiClient.get<DocumentTagDTO[]>('/tags'),
  create: (nome: string, cor?: string) => apiClient.post<DocumentTagDTO>('/tags', { nome, cor }),
};
