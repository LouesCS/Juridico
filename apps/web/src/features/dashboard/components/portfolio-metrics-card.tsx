'use client';

import { BarChart3 } from 'lucide-react';
import { usePortfolioMetrics } from '../api/queries';
import { DashboardCard } from './dashboard-card';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Visível só para quem tem `report:metrics:read` (Permission Engine,
 * Prompt 12 — antes era uma lista fixa de nomes de papel, ver
 * docs/ux/05-dashboard.md §5.3) — o gate é feito pelo componente pai
 * (`dashboard-page.tsx`), não aqui, para o card em si continuar simples.
 */
export function PortfolioMetricsCard() {
  const { data: metrics, isLoading, isError, refetch } = usePortfolioMetrics();

  return (
    <DashboardCard
      title="Métricas de Carteira"
      source="mock"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={!metrics}
      emptyIcon={BarChart3}
      emptyTitle="Sem métricas disponíveis"
    >
      {metrics && (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Processos ativos" value={metrics.processosAtivos} />
          <Metric label="Prazos em risco" value={metrics.prazosEmRisco} />
          <Metric label="Processos parados" value={metrics.processosParados} />
          <Metric label="Novos clientes no mês" value={metrics.novosClientesNoMes} />
        </div>
      )}
    </DashboardCard>
  );
}
