import type { ListTasksParams, TaskTimelineParams } from './tasks.api';

export const tasksKeys = {
  all: (officeId: string) => ['office', officeId, 'tasks'] as const,
  lists: (officeId: string) => [...tasksKeys.all(officeId), 'list'] as const,
  list: (officeId: string, params: ListTasksParams) => [...tasksKeys.lists(officeId), params] as const,
  config: (officeId: string) => [...tasksKeys.all(officeId), 'config'] as const,
  dashboard: (officeId: string) => [...tasksKeys.all(officeId), 'dashboard'] as const,
  details: (officeId: string) => [...tasksKeys.all(officeId), 'detail'] as const,
  detail: (officeId: string, taskId: string) => [...tasksKeys.details(officeId), taskId] as const,
  comments: (officeId: string, taskId: string) => [...tasksKeys.detail(officeId, taskId), 'comments'] as const,
  timelines: (officeId: string, taskId: string) => [...tasksKeys.detail(officeId, taskId), 'timeline'] as const,
  timeline: (officeId: string, taskId: string, params: TaskTimelineParams) =>
    [...tasksKeys.timelines(officeId, taskId), params] as const,
};
