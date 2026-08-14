'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { deadlinesApi, type ListDeadlinesParams } from './deadlines.api';
import { deadlinesKeys } from './keys';

export function useDeadlines(params: ListDeadlinesParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: deadlinesKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => deadlinesApi.list(params),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}
