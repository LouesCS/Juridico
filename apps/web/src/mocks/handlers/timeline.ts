import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/timeline/`
 * (módulo real desde a Sprint 08 — reafirma docs/api/11-timeline.md).
 * Usados só em teste (Vitest).
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, code, correlationId: 'mock-correlation-id', timestamp: new Date(0).toISOString() },
    { status },
  );
}

interface MockTimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  dataEvento: string;
  origem: 'MANUAL' | 'SISTEMA' | 'IA' | 'IMPORTACAO';
  autor: { id: string; nome: string } | null;
  entidadeRelacionada: { tipo: string; id: string } | null;
  fixado: boolean;
  editavel: boolean;
}

let caseTimelines: Record<string, MockTimelineEvent[]> = {};

function seed() {
  caseTimelines = {
    'case-1': [
      {
        id: 'evento-1',
        tipo: 'CRIACAO_PROCESSO',
        titulo: 'Processo "Ação de cobrança — Silva vs. Acme" criado',
        descricao: null,
        dataEvento: '2026-07-01T09:00:00.000Z',
        origem: 'SISTEMA',
        autor: { id: 'mock-membro-1', nome: 'Usuária' },
        entidadeRelacionada: null,
        fixado: false,
        editavel: false,
      },
      {
        id: 'evento-2',
        tipo: 'ALTERACAO_STATUS',
        titulo: 'Status alterado de ATIVO para SUSPENSO',
        descricao: null,
        dataEvento: '2026-07-15T14:00:00.000Z',
        origem: 'SISTEMA',
        autor: { id: 'mock-membro-1', nome: 'Usuária' },
        entidadeRelacionada: null,
        fixado: false,
        editavel: false,
      },
    ],
  };
}
seed();

export function resetTimelineMocks() {
  seed();
}

export const timelineHandlers = [
  http.get(`${base}/legal-cases/:id/timeline`, ({ params, request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const tipoFiltro = url.searchParams.get('tipo');
    let items = caseTimelines[params.id as string] ?? [];
    if (q) items = items.filter((e) => e.titulo.toLowerCase().includes(q));
    if (tipoFiltro) {
      const tipos = tipoFiltro.split(',');
      items = items.filter((e) => tipos.includes(e.tipo));
    }
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.post(`${base}/legal-cases/:id/timeline`, async ({ params, request }) => {
    const body = (await request.json()) as { tipo?: string; titulo?: string; descricao?: string };
    const caseId = params.id as string;
    caseTimelines[caseId] = caseTimelines[caseId] ?? [];
    const novo: MockTimelineEvent = {
      id: `evento-manual-${caseTimelines[caseId].length + 1}`,
      tipo: body.tipo ?? 'ANOTACAO',
      titulo: body.titulo ?? '',
      descricao: body.descricao ?? null,
      dataEvento: new Date().toISOString(),
      origem: 'MANUAL',
      autor: { id: 'mock-membro-1', nome: 'Usuária' },
      entidadeRelacionada: null,
      fixado: false,
      editavel: true,
    };
    caseTimelines[caseId] = [novo, ...caseTimelines[caseId]];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),

  http.patch(`${base}/legal-cases/:id/timeline/:eventoId`, async ({ params, request }) => {
    const caseId = params.id as string;
    const evento = (caseTimelines[caseId] ?? []).find((e) => e.id === params.eventoId);
    if (!evento) return problem(404, 'NOT_FOUND', 'Evento não encontrado.');
    if (evento.origem !== 'MANUAL') return problem(403, 'SYSTEM_EVENT_NOT_DELETABLE', 'Evento do sistema.');
    const body = (await request.json()) as { fixado?: boolean };
    if (body.fixado !== undefined) evento.fixado = body.fixado;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/legal-cases/:id/timeline/:eventoId`, ({ params }) => {
    const caseId = params.id as string;
    const evento = (caseTimelines[caseId] ?? []).find((e) => e.id === params.eventoId);
    if (!evento) return problem(404, 'NOT_FOUND', 'Evento não encontrado.');
    if (evento.origem !== 'MANUAL') return problem(403, 'SYSTEM_EVENT_NOT_DELETABLE', 'Evento do sistema.');
    caseTimelines[caseId] = caseTimelines[caseId].filter((e) => e.id !== params.eventoId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/timeline`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 8);
    const all = Object.entries(caseTimelines).flatMap(([caseId, events]) =>
      events.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        dataEvento: e.dataEvento,
        processo: { id: caseId, titulo: 'Ação de cobrança — Silva vs. Acme' },
        autor: e.autor ? { nome: e.autor.nome } : null,
      })),
    );
    return HttpResponse.json(all.slice(0, limit));
  }),
];
