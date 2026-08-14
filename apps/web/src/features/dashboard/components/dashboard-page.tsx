'use client';

import { AiInsightsCard } from '@/features/ai';
import { usePermission } from '@/hooks/use-permission';
import { AgendaTodayCard } from './agenda-today-card';
import { ContinueWorkingCard } from './continue-working-card';
import { DeadlinesCard } from './deadlines-card';
import { GreetingHeader } from './greeting-header';
import { NotificationsCard } from './notifications-card';
import { PortfolioMetricsCard } from './portfolio-metrics-card';
import { RecentActivityCard } from './recent-activity-card';
import { RecentCasesCard } from './recent-cases-card';
import { RecentDocumentsCard } from './recent-documents-card';
import { RecentSearchesCard } from './recent-searches-card';
import { StorageIndicatorCard } from './storage-indicator-card';
import { TaskSummaryCard } from './task-summary-card';
import { TeamSummaryCard } from './team-summary-card';
import { WorkloadCard } from './workload-card';

/**
 * Reafirma docs/ux/05-dashboard.md §5.2/§5.3 — grid de 2 colunas em
 * desktop, empilhado em telas menores; cada card some (não desabilita)
 * conforme permissão/papel, nunca aparece vazio-de-propósito por falta
 * de acesso. Sprint 08: Agenda do Dia, Prazos Críticos, Carga de Trabalho
 * e Atividade Recente passaram a usar Deadlines/Timeline reais — um
 * "Calendário" dedicado neste grid seria redundante com o botão "Ver
 * calendário" da Agenda do Dia, que já leva ao calendário completo em
 * `/prazos` (decisão registrada em docs/frontend-implementation/19-decisions.md).
 *
 * Permission Engine (Prompt 12) — o card de métricas do portfólio era
 * gated por uma lista fixa de nomes de papel (`['OWNER','ADMIN','SOCIO']`),
 * exatamente o padrão que este Prompt pede pra eliminar ("Nunca utilizar
 * permissões fixas"). Trocado por `report:metrics:read` (catálogo novo em
 * `prisma/seed.ts`) — hoje concedida por padrão aos mesmos 3 papéis mais
 * GESTOR/FINANCEIRO, mas agora configurável por perfil customizado, sem
 * precisar tocar código.
 */
export function DashboardPage() {
  const canSeeTeam = usePermission('member:read');
  const canSeeMetrics = usePermission('report:metrics:read');

  return (
    <div>
      <GreetingHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgendaTodayCard />
        <DeadlinesCard />
        <TaskSummaryCard />
        <ContinueWorkingCard />
        <RecentActivityCard />
        <RecentCasesCard />
        <WorkloadCard />
        <RecentDocumentsCard />
        <StorageIndicatorCard />
        <RecentSearchesCard />
        <AiInsightsCard />
        {canSeeTeam && <TeamSummaryCard />}
        {canSeeMetrics && <PortfolioMetricsCard />}
        <NotificationsCard />
      </div>
    </div>
  );
}
