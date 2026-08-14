import type { ListDeadlinesParams } from './deadlines.api';

export const deadlinesKeys = {
  all: (officeId: string) => ['office', officeId, 'deadlines'] as const,
  lists: (officeId: string) => [...deadlinesKeys.all(officeId), 'list'] as const,
  list: (officeId: string, params: ListDeadlinesParams) =>
    [...deadlinesKeys.lists(officeId), params] as const,
};
