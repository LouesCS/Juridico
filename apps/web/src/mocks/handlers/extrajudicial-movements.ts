import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import type { ExtraMovement } from '@/features/extrajudicial-movements';
const base = env.NEXT_PUBLIC_API_URL;
let rows: ExtraMovement[] = [
  {
    id: 'extra-1',
    dataMovimentacao: '2026-08-09T12:00:00.000Z',
    cliente: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
    processo: { id: 'case-extra-1', titulo: 'Negociação administrativa — Maria Oliveira' },
    pasta: { id: 'pasta-demo-1', nome: 'Documentos principais' },
    pastaJuridica: {
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      nome: 'MARIA OLIVEIRA/1',
    },
    responsavel: { id: 'member-demo-1', nome: 'Ana Responsável' },
    tipo: 'Negociação',
    origem: 'DEMO',
    status: 'Pendente',
    descricao: 'Contato realizado para negociação de acordo.',
    observacoes: 'Aguardar retorno.',
    camposExtrasValores: {},
    favorita: false,
    lida: false,
    naTimeline: false,
    tarefas: [],
    anexos: [{ id: 'doc-1', nome: 'Proposta de acordo.pdf', extensao: 'pdf' }],
    criadoEm: '2026-08-09T12:00:00.000Z',
    atualizadoEm: '2026-08-09T12:00:00.000Z',
  },
];
const initial = structuredClone(rows);
export const resetExtrajudicialMovementMocks = () => {
  rows = structuredClone(initial);
};
export const extrajudicialMovementsHandlers = [
  http.get(`${base}/extrajudicial-movements/catalogs`, () =>
    HttpResponse.json({
      tipos: [
        'Notificação',
        'Acordo',
        'Cobrança',
        'Negociação',
        'Contato',
        'Reunião',
        'Diligência',
        'Protocolo',
        'Outro',
      ],
      origens: ['Manual', 'Importação', 'Integração', 'Sistema'],
      status: ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'],
      camposExtras: [],
    }),
  ),
  http.get(`${base}/extrajudicial-movements/export`, () =>
    HttpResponse.json({ items: rows, truncado: false, limite: 5000 }),
  ),
  http.get(`${base}/extrajudicial-movements`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q');
    const params = new URL(request.url).searchParams;
    const pastaJuridicaId = params.get('pastaJuridicaId');
    const processoId = params.get('processoId');
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 20);
    if (q === 'erro') return HttpResponse.json({}, { status: 500 });
    const filtered = (q === 'vazio' ? [] : rows).filter(
      (item) => (!pastaJuridicaId || item.pastaJuridica?.id === pastaJuridicaId) && (!processoId || item.processo?.id === processoId),
    );
    const items = filtered.slice((page - 1) * limit, page * limit);
    return HttpResponse.json({
      items,
      total: filtered.length,
      page,
      limit,
      indicators: {
        total: rows.length,
        hoje: 1,
        semana: 1,
        pendentes: 1,
        favoritas: rows.filter((x) => x.favorita).length,
      },
    });
  }),
  http.get(`${base}/extrajudicial-movements/:id`, ({ params }) => {
    const item = rows.find((row) => row.id === params.id);
    if (!item) return HttpResponse.json({ title: 'Não encontrado' }, { status: 404 });
    return HttpResponse.json({
      ...item,
      descricao: `${item.descricao}\n\n[INSS]\nRecebido em: 11/08/2026 11:10\nAssunto: Requerimento realizado com sucesso\nServiço: Recurso ordinário\n\n${'Conteúdo integral da comunicação administrativa. '.repeat(30)}`,
      tarefas: [{ id: 'task-extra-1', titulo: 'Analisar retorno administrativo' }],
    });
  }),
  http.patch(`${base}/extrajudicial-movements/:id`, async ({ params, request }) => {
    const b = (await request.json()) as Record<string, unknown>;
    rows = rows.map((x) =>
      x.id === params.id
        ? {
            ...x,
            ...b,
            pastaJuridica:
              b.pastaJuridicaId === null
                ? null
                : b.pastaJuridicaId
                  ? { id: String(b.pastaJuridicaId), nome: 'Pasta Jurídica contextual' }
                  : x.pastaJuridica,
          }
        : x,
    );
    return HttpResponse.json(rows.find((x) => x.id === params.id));
  }),
  http.post(`${base}/extrajudicial-movements/:id/favorite`, ({ params }) => {
    const x = rows.find((x) => x.id === params.id);
    if (!x) return new HttpResponse(null, { status: 404 });
    x.favorita = !x.favorita;
    return HttpResponse.json({ favorita: x.favorita });
  }),
  http.post(`${base}/extrajudicial-movements/:id/read`, ({ params }) => {
    const x = rows.find((row) => row.id === params.id);
    if (!x) return new HttpResponse(null, { status: 404 });
    x.lida = !x.lida;
    return HttpResponse.json({ lida: x.lida });
  }),
  http.post(`${base}/extrajudicial-movements/:id/timeline`, ({ params }) => {
    const x = rows.find((row) => row.id === params.id);
    if (!x) return new HttpResponse(null, { status: 404 });
    const already = x.naTimeline;
    x.naTimeline = true;
    return HttpResponse.json({ lancada: true, duplicada: already });
  }),
  http.delete(`${base}/extrajudicial-movements/:id`, ({ params }) => {
    rows = rows.filter((x) => x.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
