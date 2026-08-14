import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `GET /deadlines` (agregado
 * cross-processo, Sprint 08 — reafirma docs/api/09-legal-cases.md §9.4).
 * Usados só em teste (Vitest); ações de ciclo de vida (complete/reopen/
 * duplicate/cancel/update) vivem nas rotas aninhadas de
 * `mocks/handlers/legal-cases.ts` (mesmo backend real: `/legal-cases/:id/deadlines/*`).
 */
const base = env.NEXT_PUBLIC_API_URL;

const seedDeadlines = () => [
  {
    id: 'prazo-1',
    titulo: 'Contestação',
    tipo: 'FATAL',
    origem: 'MANUAL',
    dataVencimento: new Date().toISOString(),
    prioridade: 'ALTA',
    status: 'PENDENTE',
    criadoEm: '2026-07-01T00:00:00.000Z',
    processo: { id: 'case-1', titulo: 'Ação de cobrança — Silva vs. Acme', numeroCnj: null },
    cliente: { id: 'client-1', nome: 'João da Silva' },
    responsavel: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
  },
  {
    id: 'prazo-2',
    titulo: 'Audiência de conciliação',
    tipo: 'AUDIENCIA',
    origem: 'MANUAL',
    dataVencimento: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    prioridade: 'MEDIA',
    status: 'PENDENTE',
    criadoEm: '2026-07-05T00:00:00.000Z',
    processo: { id: 'case-1', titulo: 'Ação de cobrança — Silva vs. Acme', numeroCnj: null },
    cliente: { id: 'client-1', nome: 'João da Silva' },
    responsavel: { id: 'member-2', nome: 'Bruno Advogado', avatarUrl: null },
  },
];

export const deadlinesHandlers = [
  http.get(`${base}/deadlines`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const items = q ? seedDeadlines().filter((d) => d.titulo.toLowerCase().includes(q)) : seedDeadlines();
    return HttpResponse.json({ items, nextCursor: null });
  }),
];
