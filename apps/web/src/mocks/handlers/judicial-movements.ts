import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import type { JudicialMovement } from '@/features/judicial-movements';

const base = env.NEXT_PUBLIC_API_URL;
let movements: JudicialMovement[] = [
  {
    id: 'movement-1',
    numeroCnj: '1234567-19.2024.8.26.0001',
    dataMovimento: '2026-08-09T13:00:00.000Z',
    capturadoEm: '2026-08-09T14:00:00.000Z',
    tipo: 'INTIMACAO',
    descricao: 'Expedição de intimação eletrônica para manifestação da parte autora.',
    tribunal: 'TJSP',
    provider: 'DATAJUD',
    origem: 'CAPTURA_JUDICIAL',
    situacao: 'NOVA',
    favorita: false,
    lida: false,
    naTimeline: false,
    pastaJuridica: { id: 'folder-legal-1', nome: 'MARIA OLIVEIRA/1' },
    tarefas: [{ id: 'task-judicial-1', titulo: 'Analisar intimação' }],
    processo: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      titulo: 'Ação de indenização',
      numeroCnj: '1234567-19.2024.8.26.0001',
      cliente: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
      pastasJuridicas: [{ pastaJuridica: { id: 'folder-legal-1', nome: 'MARIA OLIVEIRA/1' } }],
      configuracoesCaptura: [{ id: 'capture-demo-1', status: 'ATIVA' }],
    },
    publicacoes: [
      {
        id: 'publication-1',
        dataPublicacao: '2026-08-08T12:00:00.000Z',
        tipoComunicacao: 'Intimação',
        conteudo: 'Intimação relacionada.',
      },
    ],
  },
  {
    id: 'movement-2',
    numeroCnj: '7654321-88.2025.8.26.0002',
    dataMovimento: '2026-07-20T10:00:00.000Z',
    capturadoEm: '2026-07-20T11:00:00.000Z',
    tipo: 'DISTRIBUICAO',
    descricao: 'Processo distribuído por sorteio.',
    tribunal: 'TJSP',
    provider: 'DATAJUD',
    origem: 'CAPTURA_JUDICIAL',
    situacao: 'REGISTRADA',
    favorita: true,
    lida: true,
    naTimeline: false,
    pastaJuridica: null,
    tarefas: [],
    processo: null,
    publicacoes: [],
  },
];
const initialMovements = structuredClone(movements);
const folderMovement: JudicialMovement = {
  ...structuredClone(movements[0]),
  id: 'movement-folder-1',
  dataMovimento: '2026-08-09T13:00:00.000Z',
  tipo: 'DESPACHO',
  descricao: 'Despacho de mero expediente.',
  pastaJuridica: {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    nome: 'MARIA OLIVEIRA/1',
  },
};
export function resetJudicialMovementMocks() {
  movements = structuredClone(initialMovements);
}

function filtered(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('pt-BR');
  if (q === 'erro') return null;
  let items = q === 'vazio' ? [] : [...movements];
  if (q && q !== 'vazio')
    items = items.filter((item) =>
      [item.numeroCnj, item.descricao, item.processo?.titulo, item.processo?.cliente.nome]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(q)),
    );
  const sort = url.searchParams.get('sort');
  if (sort === 'dataMovimento')
    items.sort((a, b) => a.dataMovimento.localeCompare(b.dataMovimento));
  if (url.searchParams.get('somenteNovas') === 'true')
    items = items.filter((item) => item.situacao === 'NOVA');
  if (url.searchParams.get('somenteComPublicacao') === 'true')
    items = items.filter((item) => item.publicacoes.length);
  if (url.searchParams.get('somenteFavoritas') === 'true')
    items = items.filter((item) => item.favorita);
  return items;
}

export const judicialMovementsHandlers = [
  http.get(`${base}/judicial-movements/export`, ({ request }) =>
    HttpResponse.json({
      items: (filtered(request) ?? []).map((item) => ({
        CNJ: item.numeroCnj,
        Data: item.dataMovimento,
        Processo: item.processo?.titulo ?? '',
        Cliente: item.processo?.cliente.nome ?? '',
        Tipo: item.tipo,
        Descrição: item.descricao,
        Fonte: item.provider,
      })),
      truncado: false,
      limite: 5000,
    }),
  ),
  http.get(`${base}/judicial-movements`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('pastaJuridicaId')) {
      const items =
        url.searchParams.get('pastaJuridicaId') === folderMovement.pastaJuridica?.id
          ? [folderMovement]
          : [];
      return HttpResponse.json({ items, total: items.length, page: 1, limit: 10 });
    }
    const items = filtered(request);
    if (!items) return HttpResponse.json({ detail: 'Erro simulado.' }, { status: 503 });
    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      limit: 20,
      indicators: {
        total: movements.length,
        novas: movements.filter((item) => item.situacao === 'NOVA').length,
        hoje: 1,
        semana: 1,
        ultimaSincronizacao: '2026-08-09T14:00:00.000Z',
      },
    });
  }),
  http.get(`${base}/judicial-movements/:id`, ({ params }) => {
    const item = movements.find((movement) => movement.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),
  http.post(`${base}/judicial-movements/:id/viewed`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/judicial-movements/:id/favorite`, ({ params }) => {
    const item = movements.find((movement) => movement.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.favorita = !item.favorita;
    return HttpResponse.json({ favorita: item.favorita });
  }),
  http.post(`${base}/judicial-movements/:id/read`, ({ params }) => {
    const item = movements.find((movement) => movement.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.lida = !item.lida;
    return HttpResponse.json({ lida: item.lida });
  }),
  http.post(`${base}/judicial-movements/:id/timeline`, ({ params }) => {
    const item = movements.find((movement) => movement.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const duplicated = Boolean(item.naTimeline);
    item.naTimeline = true;
    return HttpResponse.json({ lancada: true, duplicada: duplicated });
  }),
  http.patch(`${base}/judicial-movements/:id/process`, async ({ params, request }) => {
    const item = movements.find((movement) => movement.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { processoId: string };
    item.processo = { ...movements[0].processo!, id: body.processoId };
    return HttpResponse.json(item);
  }),
];
