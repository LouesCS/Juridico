import type { SearchResultType } from './search.api';

export const searchKeys = {
  all: (officeId: string) => ['office', officeId, 'search'] as const,
  results: (officeId: string, q: string, types?: SearchResultType[]) =>
    [...searchKeys.all(officeId), 'results', q, types ?? 'all'] as const,
  suggestions: (officeId: string) => [...searchKeys.all(officeId), 'suggestions'] as const,
};
