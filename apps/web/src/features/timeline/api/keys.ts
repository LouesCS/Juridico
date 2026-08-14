import type { ListCaseTimelineParams } from './timeline.api';

export const timelineKeys = {
  all: (officeId: string, processoId: string) => ['office', officeId, 'timeline', processoId] as const,
  list: (officeId: string, processoId: string, params: ListCaseTimelineParams) =>
    [...timelineKeys.all(officeId, processoId), params] as const,
};
