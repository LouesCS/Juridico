'use client';

import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTasks } from '@/features/tasks/api/queries';
import { DashboardCard } from './dashboard-card';

/**
 * "Continuar trabalhando" (Prompt 14 §Recentes) — minhas tarefas pendentes
 * mais próximas do vencimento, mesmo padrão de `RecentCasesCard`. Não há
 * rastreamento de "última tarefa aberta" no backend ainda, então "o que
 * fazer a seguir" é aproximado pela urgência (vencimento mais próximo),
 * critério já usado em `useCaseDeadlines`/Prazos.
 */
export function ContinueWorkingCard() {
  const { data, isLoading, isError, refetch } = useTasks({
    escopo: 'meus',
    pendentes: true,
    sort: 'dataVencimento',
    limit: 5,
  });

  const tasks = data?.items ?? [];

  return (
    <DashboardCard
      title="Continuar trabalhando"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={tasks.length === 0}
      emptyIcon={CheckSquare}
      emptyTitle="Nenhuma tarefa pendente"
      emptyDescription="Você está em dia com suas tarefas."
    >
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link href={`/tarefas/${task.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
              <div className="min-w-0">
                <p className="truncate font-medium">{task.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.dataVencimento
                    ? new Date(task.dataVencimento).toLocaleDateString('pt-BR')
                    : 'Sem prazo'}
                </p>
              </div>
              {task.status && <Badge variant="secondary">{task.status.valor}</Badge>}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/tarefas/minhas" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver todas →
      </Link>
    </DashboardCard>
  );
}
