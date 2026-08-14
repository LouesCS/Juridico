import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

export const auditHandlers = [
  http.get(`${env.NEXT_PUBLIC_API_URL}/audit/context`, ({ request }) => {
    const url = new URL(request.url);
    const resourceType = url.searchParams.get('resourceType') ?? 'RECURSO';
    const period = url.searchParams.get('period') ?? 'RECENTES';
    return HttpResponse.json({
      items: period === 'ANTIGAS' ? [] : [
        {
          id: `audit-${resourceType}`,
          acao: 'Recurso consultado no modo demonstração',
          resultado: 'SUCESSO',
          atorTipo: 'USUARIO',
          atorId: 'mock-user-1',
          atorNome: 'Usuária Mock',
          recursoTipo: resourceType,
          recursoId: url.searchParams.get('resourceId'),
          dadosAntes: null,
          dadosDepois: null,
          criadoEm: '2026-08-11T12:00:00.000Z',
          motivo: null,
        },
      ],
      total: period === 'ANTIGAS' ? 0 : 1,
      page: 1,
      limit: 10,
      period,
      cutoff: '2026-05-14T00:00:00.000Z',
    });
  }),
];
