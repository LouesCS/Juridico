import type { ListClientsParams } from './clients.api';

/** Reafirma docs/frontend/10-tanstack-query.md §10.2 — chave escopada por escritório. */
export const clientsKeys = {
  all: (officeId: string) => ['office', officeId, 'clients'] as const,
  lists: (officeId: string) => [...clientsKeys.all(officeId), 'list'] as const,
  list: (officeId: string, params: ListClientsParams) =>
    [...clientsKeys.lists(officeId), params] as const,
  details: (officeId: string) => [...clientsKeys.all(officeId), 'detail'] as const,
  detail: (officeId: string, clientId: string) =>
    [...clientsKeys.details(officeId), clientId] as const,
  legalCases: (officeId: string, clientId: string) =>
    [...clientsKeys.detail(officeId, clientId), 'legal-cases'] as const,
  timeline: (officeId: string, clientId: string, params: Record<string, unknown>) =>
    [...clientsKeys.detail(officeId, clientId), 'timeline', params] as const,
};
