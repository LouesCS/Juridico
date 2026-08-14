'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { aiApi, type ChatScope, type EscopoResumoIA, type FeedbackResumo, type TipoResumoIA } from './ai.api';
import { aiKeys } from './keys';

function useInvalidateSummaries() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return (escopoTipo: EscopoResumoIA, escopoId: string) => {
    queryClient.invalidateQueries({ queryKey: aiKeys.summaries(escritorioAtivoId ?? '', escopoTipo, escopoId) });
  };
}

export function useRequestSummary() {
  const invalidate = useInvalidateSummaries();
  return useMutation({
    mutationFn: ({ escopoTipo, escopoId, tipoResumo }: { escopoTipo: EscopoResumoIA; escopoId: string; tipoResumo?: TipoResumoIA }) =>
      aiApi.requestSummary(escopoTipo, escopoId, tipoResumo),
    onSuccess: (_data, { escopoTipo, escopoId }) => invalidate(escopoTipo, escopoId),
  });
}

export function useRegenerateSummary() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ id, escopoTipo, escopoId }: { id: string; escopoTipo: EscopoResumoIA; escopoId: string }) =>
      aiApi.regenerate(id).then((result) => ({ result, escopoTipo, escopoId })),
    onSuccess: ({ escopoTipo, escopoId }) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.summaries(escritorioAtivoId ?? '', escopoTipo, escopoId) });
    },
  });
}

/**
 * `cancel`/`feedback` só recebem o `id` do resumo (não o escopo) — em vez de
 * invalidar a chave singular `aiKeys.summary` (que `AiSummaryPanel` nem
 * usa, ele lê a LISTA via `useSummaries`), invalida todas as queries de IA
 * do escritório. Mais amplo do que o necessário, mas correto — a
 * alternativa exigiria threadear `escopoTipo`/`escopoId` por toda a UI só
 * para uma invalidação mais cirúrgica.
 */
export function useCancelSummary() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (id: string) => aiApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.all(escritorioAtivoId ?? '') });
    },
  });
}

export function useSummaryFeedback() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ id, feedback, comentarioFeedback }: { id: string; feedback: FeedbackResumo; comentarioFeedback?: string }) =>
      aiApi.feedback(id, feedback, comentarioFeedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.all(escritorioAtivoId ?? '') });
    },
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: ({ escopo, pergunta }: { escopo: ChatScope; pergunta: string }) => aiApi.chat(escopo, pergunta),
  });
}
