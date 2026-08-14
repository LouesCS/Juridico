'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { useRecentActivity } from '../api/queries';
import { DashboardCard } from './dashboard-card';

/** Real desde a Sprint 08 — reaproveita `GET /timeline` (Timeline, agregado cross-processo). */
export function RecentActivityCard() {
  const { data: activity, isLoading, isError, refetch } = useRecentActivity();

  return (
    <DashboardCard
      title="Atividade Recente"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={(activity ?? []).length === 0}
      emptyIcon={Activity}
      emptyTitle="Nenhuma atividade recente"
    >
      <ul className="space-y-3">
        {activity?.map((event) => (
          <li key={event.id} className="text-sm">
            <Link href={`/processos/${event.processo.id}`} className="hover:underline">
              {event.titulo}
            </Link>
            <p className="text-xs text-muted-foreground">
              {event.processo.titulo} {event.autor ? `· ${event.autor.nome}` : ''} ·{' '}
              {new Date(event.dataEvento).toLocaleDateString('pt-BR')}
            </p>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
