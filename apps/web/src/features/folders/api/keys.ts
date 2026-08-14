import type { ListFoldersParams } from './folders.api';

export const foldersKeys = {
  all: (officeId: string) => ['office', officeId, 'folders'] as const,
  list: (officeId: string, params: ListFoldersParams) => [...foldersKeys.all(officeId), params] as const,
};
