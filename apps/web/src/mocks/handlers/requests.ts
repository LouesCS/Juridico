import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import type { RequestDTO } from '@/features/requests/api/requests.api';

const base = env.NEXT_PUBLIC_API_URL;
let rows: RequestDTO[] = [
  {
    id: 'request-1',
    descricao: 'Danos morais',
    categoria: 'Indenização',
    situacao: 'EM_ANDAMENTO',
    dataFinalizacao: null,
    estimativaExito: '75.00',
    valorPedidoCentavos: '8121314',
    valorProvavelCentavos: '2600000',
    valorPossivelCentavos: '2000000',
    valorRemotoCentavos: '1000000',
    valorFinalCentavos: null,
    anotacoes: 'Pedido principal da Pasta.',
    criadoEm: '2026-08-12T10:00:00.000Z',
    atualizadoEm: '2026-08-12T10:00:00.000Z',
    pastaJuridica: {
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      nome: 'MARIA OLIVEIRA/1',
      clientePrincipal: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
    },
    processo: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      titulo: 'Ação de indenização',
      numeroCnj: '1234567-19.2024.8.26.0001',
      tipo: 'JUDICIAL',
    },
  },
];

export const requestsHandlers = [
  http.get(`${base}/requests/options`, () =>
    HttpResponse.json({
      categorias: ['Indenização', 'Cobrança', 'Previdenciário', 'Outro'].map((value) => ({
        value,
        label: value,
      })),
      situacoes: [
        { value: 'EM_ANDAMENTO', label: 'Em andamento' },
        { value: 'FINALIZADO', label: 'Finalizado' },
        { value: 'CANCELADO', label: 'Cancelado' },
      ],
    }),
  ),
  http.get(`${base}/requests/export`, () => HttpResponse.json({ items: rows, total: rows.length })),
  http.get(`${base}/requests`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const folder = url.searchParams.get('pastaJuridicaId');
    const q = url.searchParams.get('q')?.toLowerCase();
    const result = rows.filter(
      (item) =>
        (!folder || item.pastaJuridica.id === folder) &&
        (!q || item.descricao.toLowerCase().includes(q)),
    );
    return HttpResponse.json({
      items: result.slice((page - 1) * limit, page * limit),
      total: result.length,
      page,
      limit,
    });
  }),
  http.get(`${base}/requests/:id`, ({ params }) => {
    const item = rows.find((row) => row.id === params.id);
    return item ? HttpResponse.json(item) : HttpResponse.json({}, { status: 404 });
  }),
  http.post(`${base}/requests`, async ({ request }) => {
    const body = (await request.json()) as Partial<RequestDTO>;
    const item = {
      ...rows[0],
      ...body,
      id: `request-${rows.length + 1}`,
      pastaJuridica: rows[0].pastaJuridica,
      processo: rows[0].processo,
    };
    rows = [item, ...rows];
    return HttpResponse.json(item, { status: 201 });
  }),
  http.patch(`${base}/requests/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<RequestDTO>;
    rows = rows.map((item) => (item.id === params.id ? { ...item, ...body } : item));
    return HttpResponse.json(rows.find((item) => item.id === params.id));
  }),
  http.delete(`${base}/requests/:id`, ({ params }) => {
    rows = rows.filter((item) => item.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
