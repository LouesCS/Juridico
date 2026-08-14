import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import { formatCnj, isValidCnj, normalizeCnj } from '@/lib/validators/cnj';
const base = env.NEXT_PUBLIC_API_URL;
type Config = {
  id: string;
  numeroCnj: string;
  capturaAtiva: boolean;
  status: 'ATIVA' | 'PAUSADA' | 'SINCRONIZANDO' | 'ERRO';
  ultimoResultado: string | null;
  ultimaSincronizacaoEm: string | null;
  proximaSincronizacaoEm: null;
  novidadesUltimaCaptura: number;
  ultimoErroPublico: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pasta?: { id: string; nome: string } | null;
  processo: null | {
    id: string;
    titulo: string;
    cliente: { id: string; nome: string };
    numeroCnj?: string | null;
    assunto?: string | null;
    responsavelPrincipal?: { id: string; nome: string } | null;
    partes?: Array<{ id: string; nome: string; natureza: string; ehNossoCliente?: boolean }>;
    pastasJuridicas: Array<{ pastaJuridica: { id: string; nome: string } }>;
  };
  historicos: Array<{
    id: string;
    provider: string;
    resultado: string;
    novidades: number;
    erroPublico: string | null;
    criadoEm: string;
  }>;
};
let configs: Config[] = [
  {
    id: 'capture-demo-1',
    numeroCnj: '1234567-19.2024.8.26.0001',
    capturaAtiva: true,
    status: 'ATIVA',
    ultimoResultado: 'SUCESSO',
    ultimaSincronizacaoEm: '2026-08-09T12:00:00.000Z',
    proximaSincronizacaoEm: null,
    novidadesUltimaCaptura: 2,
    ultimoErroPublico: null,
    criadoEm: '2026-08-01T12:00:00.000Z',
    atualizadoEm: '2026-08-09T12:00:00.000Z',
    pasta: { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', nome: 'MARIA OLIVEIRA/1' },
    processo: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      titulo: 'Ação de indenização',
      numeroCnj: '1234567-19.2024.8.26.0001',
      assunto: 'Responsabilidade civil',
      cliente: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
      responsavelPrincipal: { id: 'member-demo-1', nome: 'João Silva' },
      partes: [
        {
          id: 'party-demo-1',
          nome: 'Empresa XYZ',
          natureza: 'PESSOA_JURIDICA',
          ehNossoCliente: false,
        },
      ],
      pastasJuridicas: [
        { pastaJuridica: { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', nome: 'MARIA OLIVEIRA/1' } },
      ],
    },
    historicos: [
      {
        id: 'history-demo-1',
        provider: 'DATAJUD',
        resultado: 'SUCESSO',
        novidades: 2,
        erroPublico: null,
        criadoEm: '2026-08-09T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'capture-demo-without-folder',
    numeroCnj: '0000000-00.2026.8.26.0001',
    capturaAtiva: false,
    status: 'PAUSADA',
    ultimoResultado: null,
    ultimaSincronizacaoEm: null,
    proximaSincronizacaoEm: null,
    novidadesUltimaCaptura: 0,
    ultimoErroPublico: null,
    criadoEm: '2026-08-02T12:00:00.000Z',
    atualizadoEm: '2026-08-02T12:00:00.000Z',
    pasta: null,
    processo: null,
    historicos: [],
  },
];
const problem = (detail: string) =>
  HttpResponse.json(
    { title: 'Bad Request', status: 400, code: 'INVALID_CNJ', detail },
    { status: 400 },
  );
export const judicialCaptureHandlers = [
  http.get(`${base}/capture-configurations`, ({ request }) => {
    const u = new URL(request.url);
    let items = [...configs];
    const q = (u.searchParams.get('q') ?? '').toLocaleLowerCase('pt-BR');
    if (q)
      items = items.filter((item) =>
        [item.numeroCnj, item.processo?.titulo, item.processo?.cliente.nome].some((text) =>
          text?.toLocaleLowerCase('pt-BR').includes(q),
        ),
      );
    const cnj = normalizeCnj(u.searchParams.get('cnj') ?? '');
    if (cnj) items = items.filter((i) => normalizeCnj(i.numeroCnj).includes(cnj));
    const folder = u.searchParams.get('pastaJuridicaId');
    if (folder) items = items.filter((item) => item.pasta?.id === folder);
    const statuses = (u.searchParams.get('status') ?? '').split(',').filter(Boolean);
    if (statuses.length) items = items.filter((i) => statuses.includes(i.status));
    const process = (u.searchParams.get('processo') ?? '').toLocaleLowerCase('pt-BR');
    if (process)
      items = items.filter((item) =>
        item.processo?.titulo.toLocaleLowerCase('pt-BR').includes(process),
      );
    const client = (u.searchParams.get('cliente') ?? '').toLocaleLowerCase('pt-BR');
    if (client)
      items = items.filter((item) =>
        item.processo?.cliente.nome.toLocaleLowerCase('pt-BR').includes(client),
      );
    const active = u.searchParams.get('ativa');
    if (active) items = items.filter((i) => i.capturaAtiva === (active === 'true'));
    return HttpResponse.json({ items, total: items.length, page: 1, limit: 20 });
  }),
  http.get(`${base}/capture-configurations/:id`, ({ params }) => {
    const item = configs.find((i) => i.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),
  http.post(`${base}/capture-configurations/verify`, async ({ request }) => {
    const { numeroCnj } = (await request.json()) as { numeroCnj: string };
    if (!isValidCnj(numeroCnj)) return problem('Número CNJ inválido.');
    const found = !normalizeCnj(numeroCnj).startsWith('9999999');
    return HttpResponse.json({
      found,
      process: found
        ? {
            numeroCnj: formatCnj(numeroCnj),
            tribunal: 'TJSP',
            orgaoJulgador: '1ª Vara Cível',
            classe: 'Procedimento Comum Cível',
            ultimaMovimentacao: '2026-08-08T14:30:00.000Z',
          }
        : null,
      processoRelacionado:
        normalizeCnj(numeroCnj) === normalizeCnj(configs[0].numeroCnj) ? configs[0].processo : null,
    });
  }),
  http.post(`${base}/capture-configurations`, async ({ request }) => {
    const body = (await request.json()) as { numeroCnj: string; capturaAtiva: boolean };
    if (!isValidCnj(body.numeroCnj)) return problem('Número CNJ inválido.');
    const item: Config = {
      id: crypto.randomUUID(),
      numeroCnj: formatCnj(body.numeroCnj),
      capturaAtiva: body.capturaAtiva,
      status: body.capturaAtiva ? 'ATIVA' : 'PAUSADA',
      ultimoResultado: null,
      ultimaSincronizacaoEm: null,
      proximaSincronizacaoEm: null,
      novidadesUltimaCaptura: 0,
      ultimoErroPublico: null,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      processo: null,
      historicos: [],
    };
    configs = [item, ...configs];
    return HttpResponse.json(item, { status: 201 });
  }),
  http.patch(`${base}/capture-configurations/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Config>;
    const item = configs.find((i) => i.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    Object.assign(item, body, {
      status:
        body.capturaAtiva === undefined ? item.status : body.capturaAtiva ? 'ATIVA' : 'PAUSADA',
    });
    return HttpResponse.json(item);
  }),
  http.post(`${base}/capture-configurations/:id/sync`, ({ params }) => {
    const item = configs.find((i) => i.id === params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    item.ultimaSincronizacaoEm = new Date().toISOString();
    item.ultimoResultado = 'SUCESSO';
    item.novidadesUltimaCaptura = 1;
    item.historicos.unshift({
      id: crypto.randomUUID(),
      provider: 'DATAJUD',
      resultado: 'SUCESSO',
      novidades: 1,
      erroPublico: null,
      criadoEm: item.ultimaSincronizacaoEm,
    });
    return HttpResponse.json({ novidades: 1, resultado: 'SUCESSO' });
  }),
  http.delete(`${base}/capture-configurations/:id`, ({ params }) => {
    configs = configs.filter((i) => i.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
