'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { legalCasesApi } from '@/features/legal-cases/api/legal-cases.api';
import { toISODate } from '@/lib/utils/date-range';
import { dashboardApi } from './dashboard.api';
import { dashboardKeys } from './keys';

/** Real desde a Sprint 08 — próximos 7 dias, qualquer responsável do escritório. */
export function useCriticalDeadlines() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: dashboardKeys.deadlines(escritorioAtivoId ?? ''),
    queryFn: () =>
      dashboardApi.listCriticalDeadlines({
        escopo: 'todos',
        dataVencimentoAte: toISODate(new Date(Date.now() + 7 * 86_400_000)),
      }),
    enabled: !!escritorioAtivoId,
  });
}

/** Real desde a Sprint 08 — prazos com vencimento hoje ("Agenda do Dia"). */
export function useAgendaToday() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: [...dashboardKeys.all(escritorioAtivoId ?? ''), 'agenda-today'] as const,
    queryFn: () => {
      const today = toISODate(new Date());
      return dashboardApi.listCriticalDeadlines({
        escopo: 'meus',
        dataVencimentoDe: today,
        dataVencimentoAte: today,
      });
    },
    enabled: !!escritorioAtivoId,
  });
}

/** Real desde a Sprint 08 — prazos pendentes da equipe, agregados por responsável ("Carga de Trabalho"). */
export function useWorkload() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: [...dashboardKeys.all(escritorioAtivoId ?? ''), 'workload'] as const,
    queryFn: () => dashboardApi.listCriticalDeadlines({ escopo: 'equipe' }),
    enabled: !!escritorioAtivoId,
  });
}

/** Real desde o Prompt 7 — reaproveita `GET /legal-cases` (features/legal-cases). */
export function useRecentCases() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: dashboardKeys.recentCases(escritorioAtivoId ?? ''),
    queryFn: () => legalCasesApi.list({ limit: 5, sort: '-ultimaAtualizacaoEm' }),
    enabled: !!escritorioAtivoId,
  });
}

/** Real desde a Sprint 08 — reaproveita `GET /timeline` (agregado cross-processo). */
export function useRecentActivity() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: dashboardKeys.recentActivity(escritorioAtivoId ?? ''),
    queryFn: () => dashboardApi.listRecentActivity(8),
    enabled: !!escritorioAtivoId,
  });
}

export function usePortfolioMetrics() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: dashboardKeys.portfolioMetrics(escritorioAtivoId ?? ''),
    queryFn: dashboardApi.getPortfolioMetrics,
    enabled: !!escritorioAtivoId,
  });
}

export function useNotificationsPreview() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: dashboardKeys.notificationsPreview(escritorioAtivoId ?? ''),
    queryFn: dashboardApi.getNotificationsPreview,
    enabled: !!escritorioAtivoId,
  });
}
