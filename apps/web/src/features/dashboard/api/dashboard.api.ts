import { apiClient } from '@/lib/api/client';

/**
 * Desde o Prompt 7, Clients e LegalCases são reais ("Meus Processos" usa
 * `GET /v1/legal-cases`). Desde a Sprint 08, Deadlines e Timeline também
 * são reais: `GET /v1/deadlines` (Prazos Críticos, Agenda do Dia, Carga de
 * Trabalho) e `GET /v1/timeline` (Atividade Recente) — ambos agregados
 * cross-processo, documentados em docs/api/09-legal-cases.md §9.4 e
 * docs/api/11-timeline.md. Desde a Sprint 09, "Documentos Recentes" e
 * "Indicador de Armazenamento" também são reais (`GET /documents/dashboard-summary`,
 * ver `features/documents/api/documents.api.ts`). Notifications continua
 * sem controller no backend, então `portfolio-metrics`/
 * `notifications-preview` seguem mockados — tipos ilustrativos, sujeitos
 * a mudar quando esse módulo existir de fato.
 */
export interface DeadlineSummaryDTO {
  id: string;
  titulo: string;
  tipo: string;
  dataVencimento: string;
  prioridade: string;
  status: string;
  processo: { id: string; titulo: string; numeroCnj: string | null };
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
}

export interface RecentActivitySummaryDTO {
  id: string;
  tipo: string;
  titulo: string;
  dataEvento: string;
  processo: { id: string; titulo: string };
  autor: { nome: string } | null;
}

export interface PortfolioMetricsDTO {
  processosAtivos: number;
  prazosEmRisco: number;
  processosParados: number;
  novosClientesNoMes: number;
}

export interface NotificationsPreviewDTO {
  naoLidas: number;
  recentes: Array<{ id: string; titulo: string; criadaEm: string }>;
}

export const dashboardApi = {
  listCriticalDeadlines: (params: { dataVencimentoDe?: string; dataVencimentoAte?: string; escopo?: 'meus' | 'equipe' | 'todos' } = {}) =>
    apiClient
      .get<{ items: DeadlineSummaryDTO[] }>('/deadlines', {
        query: { escopo: params.escopo ?? 'todos', ...params },
      })
      .then((res) => res.items),

  listRecentActivity: (limit = 8) =>
    apiClient.get<RecentActivitySummaryDTO[]>('/timeline', { query: { limit } }),

  getPortfolioMetrics: () => apiClient.get<PortfolioMetricsDTO>('/dashboard-mock/portfolio-metrics'),
  getNotificationsPreview: () =>
    apiClient.get<NotificationsPreviewDTO>('/dashboard-mock/notifications-preview'),
};
