import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import type { Publication } from '@/features/publications';

const base = env.NEXT_PUBLIC_API_URL;

let publications: Publication[] = [
  {
    id: 'publication-1',
    numeroCnj: '1234567-19.2024.8.26.0001',
    dataPublicacao: '2026-08-08T12:00:00.000Z',
    dataDisponibilizacao: '2026-08-07T12:00:00.000Z',
    tipoComunicacao: 'Intimação',
    conteudo: 'Intimação para manifestação da parte autora no prazo legal.',
    tribunal: 'TJSP',
    diario: 'Diário da Justiça Eletrônico Nacional',
    cidade: 'São Paulo',
    orgao: 'TJSP',
    vara: '1ª Vara Cível',
    nomeVinculo: 'Maria Oliveira',
    oculta: false,
    tarefasTotal: 0,
    pastaJuridica: {
      id: 'pasta-demo-1',
      nome: 'MARIA/1',
      numeroInterno: 'MARIA/1',
      confidencial: false,
    },
    configuracaoCaptura: {
      id: 'capture-demo-1',
      numeroCnj: '1234567-19.2024.8.26.0001',
      processoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      pastaJuridicaId: 'pasta-demo-1',
    },
    provider: 'DJEN',
    capturadoEm: '2026-08-09T12:00:00.000Z',
    lida: false,
    favorita: false,
    situacao: 'NOVA',
    processo: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      titulo: 'Ação de indenização',
      cliente: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
      pastas: [{ id: 'pasta-demo-1', nome: 'Documentos principais' }],
      configuracoesCaptura: [{ id: 'capture-demo-1', status: 'ATIVA' }],
    },
    movimentoRelacionado: {
      id: 'movement-1',
      dataMovimento: '2026-08-08T13:00:00.000Z',
      descricao: 'Expedição de intimação eletrônica',
      tipo: 'INTIMACAO',
    },
  },
  {
    id: 'publication-2',
    numeroCnj: '7654321-88.2025.8.26.0002',
    dataPublicacao: '2026-08-06T12:00:00.000Z',
    dataDisponibilizacao: '2026-08-05T12:00:00.000Z',
    tipoComunicacao: 'Despacho',
    conteudo: 'Despacho sem conteúdo adicional disponibilizado pela fonte.',
    tribunal: 'TJSP',
    diario: null,
    cidade: null,
    orgao: null,
    vara: null,
    nomeVinculo: null,
    oculta: false,
    tarefasTotal: 0,
    pastaJuridica: null,
    configuracaoCaptura: null,
    provider: 'DJEN',
    capturadoEm: '2026-08-06T15:00:00.000Z',
    lida: true,
    favorita: true,
    situacao: 'LIDA',
    processo: null,
    movimentoRelacionado: null,
  },
];
const initialPublications = structuredClone(publications);

export function resetPublicationsMocks() {
  publications = structuredClone(initialPublications);
}

function list(request: Request) {
  const url = new URL(request.url);
  let items = [...publications];
  const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('pt-BR');
  if (q === 'erro') return null;
  if (q === 'vazio') items = [];
  else if (q) {
    items = items.filter((item) =>
      [
        item.numeroCnj,
        item.conteudo,
        item.nomeVinculo,
        item.cidade,
        item.diario,
        item.orgao,
        item.vara,
        item.processo?.titulo,
        item.processo?.cliente.nome,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(q)),
    );
  }
  const cidade = (url.searchParams.get('cidade') ?? '').toLocaleLowerCase('pt-BR');
  if (cidade)
    items = items.filter((item) => (item.cidade ?? '').toLocaleLowerCase('pt-BR').includes(cidade));
  const situation = url.searchParams.get('situacao');
  if (situation) items = items.filter((item) => item.situacao === situation);
  if (url.searchParams.get('somenteNovas') === 'true')
    items = items.filter((item) => item.situacao === 'NOVA');
  if (url.searchParams.get('somenteNaoLidas') === 'true')
    items = items.filter((item) => !item.lida);
  if (url.searchParams.get('somenteComMovimentacao') === 'true')
    items = items.filter((item) => item.movimentoRelacionado);
  return items;
}

export const publicationsHandlers = [
  http.get(`${base}/publications/export`, ({ request }) => {
    const items = list(request) ?? [];
    return HttpResponse.json({
      items: items.map((item) => ({
        CNJ: item.numeroCnj,
        Tribunal: item.tribunal,
        Tipo: item.tipoComunicacao,
        Publicação: item.dataPublicacao,
        Processo: item.processo?.titulo ?? '',
        Cliente: item.processo?.cliente.nome ?? '',
      })),
      truncado: false,
      limite: 5000,
    });
  }),
  http.get(`${base}/publications`, ({ request }) => {
    const items = list(request);
    if (!items) return HttpResponse.json({ detail: 'Falha simulada da fonte.' }, { status: 503 });
    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      limit: 20,
      indicators: {
        total: publications.length,
        novas: publications.filter((item) => item.situacao === 'NOVA').length,
        lidas: publications.filter((item) => item.lida).length,
        pendentes: publications.filter((item) => item.situacao === 'PENDENTE').length,
        ultimaSincronizacao: '2026-08-09T12:00:00.000Z',
      },
    });
  }),
  http.get(`${base}/publications/:id`, ({ params }) => {
    const item = publications.find((publication) => publication.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),
  http.post(`${base}/publications/:id/viewed`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/publications/:id/read`, ({ params }) => {
    const item = publications.find((publication) => publication.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.lida = !item.lida;
    item.situacao = item.lida ? 'LIDA' : 'NOVA';
    return HttpResponse.json({ lida: item.lida });
  }),
  http.post(`${base}/publications/:id/favorite`, ({ params }) => {
    const item = publications.find((publication) => publication.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.favorita = !item.favorita;
    return HttpResponse.json({ favorita: item.favorita });
  }),
  http.post(`${base}/publications/:id/visibility`, ({ params }) => {
    const item = publications.find((publication) => publication.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.oculta = !item.oculta;
    return HttpResponse.json({ oculta: item.oculta });
  }),
  http.patch(`${base}/publications/:id/link`, async ({ params, request }) => {
    const item = publications.find((publication) => publication.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { pastaJuridicaId: string; processoId?: string };
    item.pastaJuridica = {
      id: body.pastaJuridicaId,
      nome: 'MARIA/1',
      numeroInterno: 'MARIA/1',
      confidencial: false,
    };
    return HttpResponse.json({ id: item.id });
  }),
  http.delete(`${base}/publications/:id`, ({ params }) => {
    publications = publications.filter((publication) => publication.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
