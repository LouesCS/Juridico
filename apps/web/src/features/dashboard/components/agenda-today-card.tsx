'use client';

import Link from 'next/link';
import { Sun } from 'lucide-react';
import { StatusBadge } from '@/components/data-display/status-badge';
import { useAgendaToday } from '../api/queries';
import { DashboardCard } from './dashboard-card';

/** Real desde a Sprint 08 — "Agenda do Dia" (`GET /deadlines`, hoje, escopo=meus). */
export function AgendaTodayCard() {
  const { data: deadlines, isLoading, isError, refetch } = useAgendaToday();

  return (
    <DashboardCard
      title="Agenda do Dia"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={(deadlines ?? []).length === 0}
      emptyIcon={Sun}
      emptyTitle="Nada na sua agenda hoje"
      emptyDescription="Você não tem prazos com vencimento hoje."
    >
      <ul className="space-y-3">
        {deadlines?.map((deadline) => (
          <li key={deadline.id} className="flex items-center justify-between gap-2 text-sm">
            <Link href={`/processos/${deadline.processo.id}`} className="min-w-0 hover:underline">
              <p className="truncate font-medium">{deadline.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{deadline.processo.titulo}</p>
            </Link>
            <StatusBadge status={deadline.status} />
          </li>
        ))}
      </ul>
      <Link href="/prazos" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver calendário →
      </Link>
    </DashboardCard>
  );
}
