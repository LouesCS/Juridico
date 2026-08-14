'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { aiApi, type EscopoResumoIA } from './ai.api';
import { aiKeys } from './keys';

/**
 * Reafirma docs/api/14-ai.md §14.3 — o backend expõe SSE real
 * (`GET /ai-summaries/:id/stream`), mas `EventSource` não é implementável em
 * jsdom/MSW neste ambiente de teste (mesma limitação já registrada para
 * Notifications, docs/frontend/20-notifications-sse.md, nunca consumido no
 * frontend apesar do contrato existir). Em vez de um consumidor SSE
 * impossível de testar, `useSummary` faz *poll* via TanStack Query
 * (`refetchInterval`) enquanto `status` é `GERANDO`/`PENDENTE` — do ponto de
 * vista do usuário o resultado é o mesmo (a tela atualiza sozinha até
 * `PRONTO`/`FALHA`), documentado como simplificação deliberada.
 */
export function useSummary(id: string | null) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: aiKeys.summary(escritorioAtivoId ?? '', id ?? ''),
    queryFn: () => aiApi.getSummary(id!),
    enabled: !!escritorioAtivoId && !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'GERANDO' || status === 'PENDENTE' ? 1000 : false;
    },
  });
}

export function useSummaries(escopoTipo: EscopoResumoIA, escopoId: string | null) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: aiKeys.summaries(escritorioAtivoId ?? '', escopoTipo, escopoId ?? ''),
    queryFn: () => aiApi.listSummaries(escopoTipo, escopoId!),
    enabled: !!escritorioAtivoId && !!escopoId,
    refetchInterval: (query) => {
      const emAndamento = query.state.data?.some((s) => s.status === 'GERANDO' || s.status === 'PENDENTE');
      return emAndamento ? 1000 : false;
    },
  });
}

export function useSummarySources(id: string | null) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: aiKeys.sources(escritorioAtivoId ?? '', id ?? ''),
    queryFn: () => aiApi.getSources(id!),
    enabled: !!escritorioAtivoId && !!id,
  });
}

export function useAiDashboardInsights() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: aiKeys.insights(escritorioAtivoId ?? ''),
    queryFn: () => aiApi.dashboardInsights(),
    enabled: !!escritorioAtivoId,
  });
}

export function useAiUsage(enabled: boolean) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: aiKeys.usage(escritorioAtivoId ?? ''),
    queryFn: () => aiApi.usage(),
    enabled: !!escritorioAtivoId && enabled,
  });
}
