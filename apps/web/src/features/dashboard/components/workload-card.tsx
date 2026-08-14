'use client';

import * as React from 'react';
import { Users } from 'lucide-react';
import { useWorkload } from '../api/queries';
import { DashboardCard } from './dashboard-card';

/**
 * Real desde a Sprint 08 — "Carga de Trabalho": prazos pendentes da
 * equipe (`GET /deadlines?escopo=equipe`), agregados por responsável no
 * cliente (o backend não expõe um agregado por-pessoa dedicado; agregar
 * client-side aqui evita mais um endpoint para uma soma simples).
 */
export function WorkloadCard() {
  const { data: deadlines, isLoading, isError, refetch } = useWorkload();

  const porResponsavel = React.useMemo(() => {
    const map = new Map<string, { nome: string; total: number }>();
    for (const deadline of deadlines ?? []) {
      if (!deadline.responsavel) continue;
      const atual = map.get(deadline.responsavel.id) ?? { nome: deadline.responsavel.nome, total: 0 };
      atual.total += 1;
      map.set(deadline.responsavel.id, atual);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [deadlines]);

  const maiorCarga = porResponsavel[0]?.total ?? 1;

  return (
    <DashboardCard
      title="Carga de Trabalho"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={porResponsavel.length === 0}
      emptyIcon={Users}
      emptyTitle="Sem prazos pendentes na equipe"
    >
      <ul className="space-y-3">
        {porResponsavel.slice(0, 6).map((pessoa) => (
          <li key={pessoa.nome} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{pessoa.nome}</span>
              <span className="text-xs text-muted-foreground">{pessoa.total} prazos</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(8, (pessoa.total / maiorCarga) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
