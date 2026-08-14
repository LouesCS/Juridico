import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, code, correlationId: 'mock-correlation-id', timestamp: new Date(0).toISOString() },
    { status },
  );
}

export interface MockFolder {
  id: string;
  nome: string;
  pastaPaiId: string | null;
  processoId: string | null;
  ordem: number;
  totalDocumentos: number;
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

let folders: MockFolder[] = [];

function seed() {
  folders = [
    { id: 'pasta-1', nome: 'Contratos', pastaPaiId: null, processoId: null, ordem: 0, totalDocumentos: 2, favorito: false, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' },
    { id: 'pasta-2', nome: '2026', pastaPaiId: 'pasta-1', processoId: null, ordem: 0, totalDocumentos: 1, favorito: false, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' },
    { id: 'pasta-3', nome: 'Procurações', pastaPaiId: null, processoId: null, ordem: 1, totalDocumentos: 0, favorito: true, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' },
  ];
}
seed();

export function resetFoldersMocks() {
  seed();
}

export const foldersHandlers = [
  http.get(`${base}/folders`, ({ request }) => {
    const url = new URL(request.url);
    const processoId = url.searchParams.get('processoId');
    const q = url.searchParams.get('q')?.toLowerCase();
    let items = folders.filter((f) => (f.processoId ?? null) === (processoId ?? null));
    if (q) items = items.filter((f) => f.nome.toLowerCase().includes(q));
    return HttpResponse.json(items);
  }),

  http.post(`${base}/folders`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; processoId?: string; pastaPaiId?: string };
    const nova: MockFolder = {
      id: `pasta-nova-${folders.length + 1}`,
      nome: body.nome,
      pastaPaiId: body.pastaPaiId ?? null,
      processoId: body.processoId ?? null,
      ordem: folders.length,
      totalDocumentos: 0,
      favorito: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    folders = [...folders, nova];
    return HttpResponse.json({ id: nova.id }, { status: 201 });
  }),

  http.patch(`${base}/folders/:id`, async ({ params, request }) => {
    const folder = folders.find((f) => f.id === params.id);
    if (!folder) return problem(404, 'NOT_FOUND', 'Pasta não encontrada.');
    const body = (await request.json()) as { nome?: string; pastaPaiId?: string | null };
    if (body.nome !== undefined) folder.nome = body.nome;
    if (body.pastaPaiId !== undefined) folder.pastaPaiId = body.pastaPaiId;
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/folders/:id/reorder`, async ({ params, request }) => {
    const folder = folders.find((f) => f.id === params.id);
    if (!folder) return problem(404, 'NOT_FOUND', 'Pasta não encontrada.');
    const body = (await request.json()) as { ordem: number };
    folder.ordem = body.ordem;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/folders/:id`, ({ params, request }) => {
    const folder = folders.find((f) => f.id === params.id);
    if (!folder) return problem(404, 'NOT_FOUND', 'Pasta não encontrada.');
    const url = new URL(request.url);
    const cascata = url.searchParams.get('cascata') === 'true';
    if (folder.totalDocumentos > 0 && !cascata) {
      return problem(409, 'FOLDER_NOT_EMPTY', 'Pasta não está vazia.');
    }
    folders = folders.filter((f) => f.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/folders/:id/restore`, ({ params }) => {
    const folder = folders.find((f) => f.id === params.id);
    if (!folder) return problem(404, 'NOT_FOUND', 'Pasta não encontrada.');
    return new HttpResponse(null, { status: 201 });
  }),

  http.post(`${base}/folders/:id/favorite`, ({ params }) => {
    const folder = folders.find((f) => f.id === params.id);
    if (!folder) return problem(404, 'NOT_FOUND', 'Pasta não encontrada.');
    folder.favorito = !folder.favorito;
    return HttpResponse.json({ favorito: folder.favorito });
  }),
];
