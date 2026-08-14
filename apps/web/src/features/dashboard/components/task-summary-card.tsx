'use client';

import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import { useTaskDashboard } from '@/features/tasks/api/queries';
import { DashboardCard } from './dashboard-card';

/**
 * "Dashboard: Minhas tarefas, Equipe, Atrasadas, Hoje, Próximas, Concluídas,
 * Produtividade" (Prompt 14 §Dashboard) — um card único com os 6 números +
 * barra de produtividade, em vez de 7 cards separados, para não lotar o
 * grid de 2 colunas do Dashboard (mesma economia de espaço de
 * `WorkloadCard`, que também agrega vários números num card só).
 */
export function TaskSummaryCard() {
  const { data, isLoading, isError, refetch } = useTaskDashboard();

  const tiles = data
    ? [
        { label: 'Minhas pendentes', value: data.minhasTarefasPendentes, href: '/tarefas/minhas' },
        { label: 'Da equipe', value: data.equipeTarefasPendentes, href: '/tarefas/equipe' },
        { label: 'Atrasadas', value: data.atrasadas, href: '/tarefas/minhas', destaque: data.atrasadas > 0 },
        { label: 'Hoje', value: data.hoje, href: '/tarefas/calendario' },
        { label: 'Próximos 7 dias', value: data.proximas, href: '/tarefas/calendario' },
        { label: 'Concluídas no mês', value: data.concluidasNoMes, href: '/tarefas/minhas' },
      ]
    : [];

  return (
    <DashboardCard
      title="Tarefas"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={false}
      emptyIcon={CheckSquare}
      emptyTitle="Sem tarefas"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-accent"
          >
            <p className={`text-xl font-semibold ${tile.destaque ? 'text-destructive' : ''}`}>{tile.value}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </Link>
        ))}
      </div>

      {data && (
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Produtividade do mês</span>
            <span className="font-medium">{data.produtividade.percentual}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, data.produtividade.percentual)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {data.produtividade.concluidas} concluída(s) de {data.produtividade.criadas} criada(s)
          </p>
        </div>
      )}

      <Link href="/tarefas/kanban" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver Kanban →
      </Link>
    </DashboardCard>
  );
}
