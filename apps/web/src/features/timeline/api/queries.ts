'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { timelineApi, type ListCaseTimelineParams } from './timeline.api';
import { timelineKeys } from './keys';

export function useCaseTimeline(processoId: string, params: ListCaseTimelineParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: timelineKeys.list(escritorioAtivoId ?? '', processoId, params),
    queryFn: () => timelineApi.list(processoId, params),
    enabled: !!escritorioAtivoId && !!processoId,
    placeholderData: (previous) => previous,
  });
}
