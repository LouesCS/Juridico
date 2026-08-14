'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { tasksApi, type ListTasksParams, type TaskTimelineParams } from './tasks.api';
import { tasksKeys } from './keys';

export function useTaskConfig() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.config(escritorioAtivoId ?? ''),
    queryFn: tasksApi.getConfig,
    enabled: !!escritorioAtivoId,
    staleTime: 5 * 60_000,
  });
}

export function useTaskDashboard() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.dashboard(escritorioAtivoId ?? ''),
    queryFn: tasksApi.getDashboard,
    enabled: !!escritorioAtivoId,
  });
}

export function useTasks(params: ListTasksParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => tasksApi.list(params),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}

export function useTask(taskId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.detail(escritorioAtivoId ?? '', taskId),
    queryFn: () => tasksApi.get(taskId),
    enabled: !!escritorioAtivoId && !!taskId,
  });
}

export function useTaskComments(taskId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.comments(escritorioAtivoId ?? '', taskId),
    queryFn: () => tasksApi.listComments(taskId),
    enabled: !!escritorioAtivoId && !!taskId,
  });
}

export function useTaskTimeline(taskId: string, params: TaskTimelineParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: tasksKeys.timeline(escritorioAtivoId ?? '', taskId, params),
    queryFn: () => tasksApi.listTimeline(taskId, params),
    enabled: !!escritorioAtivoId && !!taskId,
    placeholderData: (previous) => previous,
  });
}
