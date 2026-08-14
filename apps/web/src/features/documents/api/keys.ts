import type { ListDocumentsParams } from './documents.api';

export const documentsKeys = {
  all: (officeId: string) => ['office', officeId, 'documents'] as const,
  lists: (officeId: string) => [...documentsKeys.all(officeId), 'list'] as const,
  list: (officeId: string, params: ListDocumentsParams) => [...documentsKeys.lists(officeId), params] as const,
  detail: (officeId: string, id: string) => [...documentsKeys.all(officeId), 'detail', id] as const,
  versions: (officeId: string, id: string) => [...documentsKeys.all(officeId), 'versions', id] as const,
  dashboardSummary: (officeId: string) => [...documentsKeys.all(officeId), 'dashboard-summary'] as const,
};
