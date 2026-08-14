'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { legalCasesKeys } from '@/features/legal-cases/api/keys';
import { deadlinesApi, type CreateDeadlineInput, type UpdateDeadlineInput } from './deadlines.api';
import { deadlinesKeys } from './keys';

/**
 * A listagem de Prazos (`/prazos`) mostra prazos de processos diferentes
 * na mesma tela — os hooks abaixo recebem `processoId` como parte das
 * variáveis da mutation (não fixado na criação do hook) para que uma
 * única instância sirva qualquer linha da tabela, sem violar a regra de
 * hooks (nada de `useMutation` condicional por linha).
 */
function useInvalidateDeadlines() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return (processoId: string) => {
    queryClient.invalidateQueries({ queryKey: deadlinesKeys.lists(escritorioAtivoId ?? '') });
    queryClient.invalidateQueries({
      queryKey: legalCasesKeys.deadlines(escritorioAtivoId ?? '', processoId),
    });
  };
}

export function useCreateDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({ processoId, input }: { processoId: string; input: CreateDeadlineInput }) =>
      deadlinesApi.create(processoId, input),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}

export function useUpdateDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({
      processoId,
      prazoId,
      input,
    }: {
      processoId: string;
      prazoId: string;
      input: UpdateDeadlineInput;
    }) => deadlinesApi.update(processoId, prazoId, input),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}

export function useCancelDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({
      processoId,
      prazoId,
      motivo,
    }: {
      processoId: string;
      prazoId: string;
      motivo?: string;
    }) => deadlinesApi.cancel(processoId, prazoId, motivo),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}

export function useCompleteDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({ processoId, prazoId }: { processoId: string; prazoId: string }) =>
      deadlinesApi.complete(processoId, prazoId),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}

export function useReopenDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({ processoId, prazoId }: { processoId: string; prazoId: string }) =>
      deadlinesApi.reopen(processoId, prazoId),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}

export function useDuplicateDeadline() {
  const invalidate = useInvalidateDeadlines();
  return useMutation({
    mutationFn: ({ processoId, prazoId }: { processoId: string; prazoId: string }) =>
      deadlinesApi.duplicate(processoId, prazoId),
    onSuccess: (_data, { processoId }) => invalidate(processoId),
  });
}
