'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import {
  tasksApi,
  type CreateTaskFromTemplateInput,
  type CreateTaskInput,
  type TaskLinkType,
  type UpdateTaskInput,
} from './tasks.api';
import { tasksKeys } from './keys';

/**
 * Todas as mutations abaixo recebem `tarefaId` como variável da própria
 * mutation (nunca fixado na criação do hook) — mesmo padrão de
 * `features/deadlines/api/mutations.ts`, mas aqui a razão é ainda mais
 * forte: o Kanban e as listas (Minhas Tarefas/Equipe) mostram dezenas de
 * tarefas diferentes na mesma tela, então uma única instância de cada hook
 * precisa servir qualquer card/linha sem violar a regra de hooks.
 */
function useInvalidateTasks() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: tasksKeys.lists(escritorioAtivoId ?? '') });
    queryClient.invalidateQueries({ queryKey: tasksKeys.dashboard(escritorioAtivoId ?? '') });
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(escritorioAtivoId ?? '', taskId) });
      queryClient.invalidateQueries({ queryKey: tasksKeys.timelines(escritorioAtivoId ?? '', taskId) });
    }
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateTaskFromTemplate() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: CreateTaskFromTemplateInput) => tasksApi.createFromTemplate(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, input }: { tarefaId: string; input: UpdateTaskInput }) =>
      tasksApi.update(tarefaId, input),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.remove(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useArchiveTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.archive(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useRestoreTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.restore(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useDuplicateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.duplicate(tarefaId),
    onSuccess: () => invalidate(),
  });
}

export function useMoveTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, statusId }: { tarefaId: string; statusId: string | null }) =>
      tasksApi.move(tarefaId, statusId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useReopenTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.reopen(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.complete(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useCancelTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, motivo }: { tarefaId: string; motivo?: string }) =>
      tasksApi.cancel(tarefaId, motivo),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useToggleTaskFavorite() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (tarefaId: string) => tasksApi.toggleFavorite(tarefaId),
    onSuccess: (_data, tarefaId) => invalidate(tarefaId),
  });
}

export function useAddChecklistItem() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      tarefaId,
      input,
    }: {
      tarefaId: string;
      input: { titulo: string; obrigatorio?: boolean; ordem?: number };
    }) => tasksApi.addChecklistItem(tarefaId, input),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useUpdateChecklistItem() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      tarefaId,
      itemId,
      input,
    }: {
      tarefaId: string;
      itemId: string;
      input: { titulo?: string; obrigatorio?: boolean; ordem?: number; concluido?: boolean };
    }) => tasksApi.updateChecklistItem(tarefaId, itemId, input),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useRemoveChecklistItem() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, itemId }: { tarefaId: string; itemId: string }) =>
      tasksApi.removeChecklistItem(tarefaId, itemId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useAddDependency() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, dependeDeId }: { tarefaId: string; dependeDeId: string }) =>
      tasksApi.addDependency(tarefaId, dependeDeId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useRemoveDependency() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, dependeDeId }: { tarefaId: string; dependeDeId: string }) =>
      tasksApi.removeDependency(tarefaId, dependeDeId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useAddTaskLink() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      tarefaId,
      input,
    }: {
      tarefaId: string;
      input: { tipoRecurso: TaskLinkType; recursoId: string };
    }) => tasksApi.addLink(tarefaId, input),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useRemoveTaskLink() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, vinculoId }: { tarefaId: string; vinculoId: string }) =>
      tasksApi.removeLink(tarefaId, vinculoId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useAddTaskResponsible() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, membroId }: { tarefaId: string; membroId: string }) =>
      tasksApi.addResponsible(tarefaId, membroId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useRemoveTaskResponsible() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ tarefaId, membroId }: { tarefaId: string; membroId: string }) =>
      tasksApi.removeResponsible(tarefaId, membroId),
    onSuccess: (_data, { tarefaId }) => invalidate(tarefaId),
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ tarefaId, conteudo }: { tarefaId: string; conteudo: string }) =>
      tasksApi.createComment(tarefaId, conteudo),
    onSuccess: (_data, { tarefaId }) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.comments(escritorioAtivoId ?? '', tarefaId) });
      queryClient.invalidateQueries({ queryKey: tasksKeys.timelines(escritorioAtivoId ?? '', tarefaId) });
    },
  });
}
