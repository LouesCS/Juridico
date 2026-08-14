import type { ListLegalCasesParams } from './legal-cases.api';

export const legalCasesKeys = {
  all: (officeId: string) => ['office', officeId, 'legal-cases'] as const,
  lists: (officeId: string) => [...legalCasesKeys.all(officeId), 'list'] as const,
  list: (officeId: string, params: ListLegalCasesParams) =>
    [...legalCasesKeys.lists(officeId), params] as const,
  details: (officeId: string) => [...legalCasesKeys.all(officeId), 'detail'] as const,
  detail: (officeId: string, caseId: string) =>
    [...legalCasesKeys.details(officeId), caseId] as const,
  team: (officeId: string, caseId: string) =>
    [...legalCasesKeys.detail(officeId, caseId), 'team'] as const,
  parties: (officeId: string, caseId: string) =>
    [...legalCasesKeys.detail(officeId, caseId), 'parties'] as const,
  deadlines: (officeId: string, caseId: string) =>
    [...legalCasesKeys.detail(officeId, caseId), 'deadlines'] as const,
};
