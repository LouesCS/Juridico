'use client';

import Link from 'next/link';
import { Scale } from 'lucide-react';
import { StatusBadge } from '@/components/data-display/status-badge';
import { useRecentCases } from '../api/queries';
import { DashboardCard } from './dashboard-card';

export function RecentCasesCard() {
  const { data, isLoading, isError, refetch } = useRecentCases();
  const cases = data?.items ?? [];

  return (
    <DashboardCard
      title="Meus Processos"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={cases.length === 0}
      emptyIcon={Scale}
      emptyTitle="Nenhum processo ainda"
    >
      <ul className="space-y-3">
        {cases.map((legalCase) => (
          <li key={legalCase.id}>
            <Link
              href={`/processos/${legalCase.id}`}
              className="flex items-center justify-between gap-2 text-sm hover:underline"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{legalCase.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{legalCase.cliente.nome}</p>
              </div>
              <StatusBadge status={legalCase.status} />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/processos" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver todos →
      </Link>
    </DashboardCard>
  );
}
