import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * `GET /deadlines` e `GET /timeline` são reais desde a Sprint 08; `GET
 * /documents/dashboard-summary` é real desde a Sprint 09 — seus handlers
 * de teste vivem em `mocks/handlers/deadlines.ts`, `mocks/handlers/timeline.ts`
 * e `mocks/handlers/documents.ts` (mesmo módulo que os alimenta de
 * verdade no backend). `/dashboard-mock/*` continua um namespace
 * deliberadamente fictício — não existe no backend nem na documentação,
 * só para os blocos que ainda não têm módulo real (Notifications) — ver
 * features/dashboard/api/dashboard.api.ts.
 */
const base = env.NEXT_PUBLIC_API_URL;

export const dashboardHandlers = [
  http.get(`${base}/dashboard-mock/portfolio-metrics`, () =>
    HttpResponse.json({
      processosAtivos: 12,
      prazosEmRisco: 2,
      processosParados: 1,
      novosClientesNoMes: 3,
    }),
  ),

  http.get(`${base}/dashboard-mock/notifications-preview`, () =>
    HttpResponse.json({
      naoLidas: 4,
      recentes: [
        { id: 'notif-1', titulo: 'Novo comentário no processo Silva', criadaEm: '2026-07-29T15:00:00.000Z' },
        { id: 'notif-2', titulo: 'Prazo vence em 2 dias', criadaEm: '2026-07-29T09:00:00.000Z' },
        { id: 'notif-3', titulo: 'Documento processado com sucesso', criadaEm: '2026-07-28T18:00:00.000Z' },
      ],
    }),
  ),
];
