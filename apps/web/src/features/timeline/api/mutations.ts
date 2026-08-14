'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { timelineApi, type CreateManualTimelineEventInput } from './timeline.api';
import { timelineKeys } from './keys';

function useInvalidateTimeline(processoId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return () =>
    queryClient.invalidateQueries({ queryKey: timelineKeys.all(escritorioAtivoId ?? '', processoId) });
}

export function useCreateManualTimelineEvent(processoId: string) {
  const invalidate = useInvalidateTimeline(processoId);
  return useMutation({
    mutationFn: (input: CreateManualTimelineEventInput) => timelineApi.createManualEvent(processoId, input),
    onSuccess: invalidate,
  });
}

export function useToggleTimelineEventPin(processoId: string) {
  const invalidate = useInvalidateTimeline(processoId);
  return useMutation({
    mutationFn: ({ eventoId, fixado }: { eventoId: string; fixado: boolean }) =>
      timelineApi.toggleFixado(processoId, eventoId, fixado),
    onSuccess: invalidate,
  });
}

export function useDeleteManualTimelineEvent(processoId: string) {
  const invalidate = useInvalidateTimeline(processoId);
  return useMutation({
    mutationFn: (eventoId: string) => timelineApi.remove(processoId, eventoId),
    onSuccess: invalidate,
  });
}
