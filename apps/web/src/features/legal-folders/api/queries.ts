import { useQuery } from '@tanstack/react-query';
import { legalFoldersApi, type LegalFolderFilters } from './legal-folders.api';
export const useLegalFolders = (filters: LegalFolderFilters) =>
  useQuery({ queryKey: ['legal-folders', filters], queryFn: () => legalFoldersApi.list(filters) });
export const useLegalFolder = (id: string) =>
  useQuery({
    queryKey: ['legal-folder', id],
    queryFn: () => legalFoldersApi.get(id),
    enabled: Boolean(id),
  });
