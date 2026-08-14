'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { foldersApi, type ListFoldersParams } from './folders.api';
import { foldersKeys } from './keys';

export function useFolders(params: ListFoldersParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: foldersKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => foldersApi.list(params),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}
