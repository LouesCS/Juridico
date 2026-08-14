'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { useCriticalDeadlines } from '../api/queries';
import { DashboardCard } from './dashboard-card';

function urgencyColor(dataVencimento: string): string {
  const days = Math.ceil((new Date(dataVencimento).getTime() - Date.now()) / 86_400_000);
  if (days <= 2) return 'bg-destructive';
  if (days <= 7) return 'bg-warning';
  return 'bg-muted-foreground';
}

export function DeadlinesCard() {
  const { data: deadlines, isLoading, isError, refetch } = useCriticalDeadlines();

  return (
    <DashboardCard
      title="Prazos Críticos"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={(deadlines ?? []).length === 0}
      emptyIcon={CalendarClock}
      emptyTitle="Nenhum prazo nos próximos 7 dias"
    >
      <ul className="space-y-3">
        {deadlines?.slice(0, 8).map((deadline) => (
          <li key={deadline.id} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${urgencyColor(deadline.dataVencimento)}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{deadline.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {deadline.processo.titulo} · {new Date(deadline.dataVencimento).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/prazos" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver todos →
      </Link>
    </DashboardCard>
  );
}
