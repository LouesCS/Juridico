import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import { members } from './team';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/clients/`
 * (módulo real nesta rodada — Prompt 7, ampliado no Sprint "Clientes e
 * Contatos"). Usados só em teste (Vitest); em desenvolvimento contra o
 * backend real, Clients não deve ser interceptado.
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string, meta?: Record<string, unknown>) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'mock-correlation-id',
      timestamp: new Date(0).toISOString(),
      ...(meta ? { meta } : {}),
    },
    { status },
  );
}

interface MockClient {
  id: string;
  nome: string;
  nomeSocial: string | null;
  razaoSocial: string | null;
  tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  categoriaRelacionamento: 'CLIENTE' | 'CONTATO' | 'CLIENTE_E_CONTATO';
  avatarUrl: string | null;
  documento: string | null;
  emails: string[];
  telefones: string[];
  telefoneResidencial: string | null;
  telefoneResponsavel: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
  enderecoCep: string | null;
  observacoes: string | null;
  status: 'ATIVO' | 'INATIVO' | 'PROSPECT';
  processosAtivos: number;
  responsavel: { id: string; nome: string } | null;
  responsavelNome: string | null;
  ultimaMovimentacaoEm: string;
  nomeMae: string | null;
  rg: string | null;
  nomePai: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  dataNascimento: string | null;
  camposExtrasValores: Record<string, string>;
  criadoEm: string;
}

/** Resolve `responsavelId` (enviado pelo formulário) em `{id, nome}` a partir do mock de Membros (`team.ts`) — mesma fonte que `useMembers()` usa no formulário. */
function resolveResponsavel(responsavelId: unknown): { id: string; nome: string } | undefined {
  if (typeof responsavelId !== 'string' || !responsavelId) return undefined;
  const membro = members.find((m) => m.id === responsavelId);
  return membro ? { id: membro.id, nome: membro.usuario.nome } : undefined;
}

const favoritos = new Set<string>();

let clients: MockClient[] = [];

function seed(): MockClient[] {
  return [
    {
      id: 'client-1',
      nome: 'João da Silva',
      nomeSocial: null,
      razaoSocial: null,
      tipo: 'PESSOA_FISICA',
      categoriaRelacionamento: 'CLIENTE',
      avatarUrl: null,
      documento: '52998224725',
      emails: ['joao@example.com'],
      telefones: ['11999990000', '11988880000'],
      telefoneResidencial: '1133334444',
      telefoneResponsavel: null,
      enderecoLogradouro: 'Rua das Flores',
      enderecoNumero: '123',
      enderecoComplemento: 'Apto 45',
      enderecoBairro: 'Centro',
      enderecoCidade: 'São Paulo',
      enderecoUf: 'SP',
      enderecoCep: '01310000',
      observacoes: 'Cliente antigo do escritório.',
      status: 'ATIVO',
      processosAtivos: 2,
      responsavel: { id: 'member-2', nome: 'Bruno Advogado' },
      responsavelNome: null,
      ultimaMovimentacaoEm: '2026-07-01T12:00:00.000Z',
      nomeMae: 'Maria da Silva',
      rg: '123456789',
      nomePai: 'José da Silva',
      estadoCivil: 'CASADO',
      profissao: 'Engenheiro',
      dataNascimento: '1985-03-20',
      camposExtrasValores: {},
      criadoEm: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'client-2',
      nome: 'Acme Ltda',
      nomeSocial: null,
      razaoSocial: 'Acme Comércio e Serviços Ltda',
      tipo: 'PESSOA_JURIDICA',
      categoriaRelacionamento: 'CONTATO',
      avatarUrl: null,
      documento: '11222333000181',
      emails: [],
      telefones: [],
      telefoneResidencial: null,
      telefoneResponsavel: '11977776666',
      enderecoLogradouro: null,
      enderecoNumero: null,
      enderecoComplemento: null,
      enderecoBairro: null,
      enderecoCidade: null,
      enderecoUf: null,
      enderecoCep: null,
      observacoes: null,
      status: 'PROSPECT',
      processosAtivos: 0,
      responsavel: null,
      responsavelNome: 'Ana Responsável',
      ultimaMovimentacaoEm: '2026-06-01T12:00:00.000Z',
      nomeMae: null,
      rg: null,
      nomePai: null,
      estadoCivil: null,
      profissao: null,
      dataNascimento: null,
      camposExtrasValores: {},
      criadoEm: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'client-com-processo',
      nome: 'Cliente Com Processo Ativo',
      nomeSocial: null,
      razaoSocial: null,
      tipo: 'PESSOA_FISICA',
      categoriaRelacionamento: 'CLIENTE_E_CONTATO',
      avatarUrl: null,
      documento: null,
      emails: [],
      telefones: [],
      telefoneResidencial: null,
      telefoneResponsavel: null,
      enderecoLogradouro: null,
      enderecoNumero: null,
      enderecoComplemento: null,
      enderecoBairro: null,
      enderecoCidade: null,
      enderecoUf: null,
      enderecoCep: null,
      observacoes: null,
      status: 'ATIVO',
      processosAtivos: 1,
      responsavel: null,
      responsavelNome: null,
      ultimaMovimentacaoEm: '2026-05-01T12:00:00.000Z',
      nomeMae: null,
      rg: null,
      nomePai: null,
      estadoCivil: null,
      profissao: null,
      dataNascimento: null,
      camposExtrasValores: {},
      criadoEm: '2026-01-03T00:00:00.000Z',
    },
  ];
}

clients = seed();

export function resetClientMocks() {
  clients = seed();
  favoritos.clear();
}

function publicClient(client: MockClient) {
  const visible = { ...client };
  Reflect.deleteProperty(visible, 'categoriaRelacionamento');
  Reflect.deleteProperty(visible, 'status');
  return visible;
}

export const clientsHandlers = [
  http.get(`${base}/clients`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const filtered = q ? clients.filter((c) => c.nome.toLowerCase().includes(q)) : clients;
    return HttpResponse.json({
      items: filtered.map((c) => ({ ...publicClient(c), favorito: favoritos.has(c.id) })),
      nextCursor: null,
    });
  }),

  // Registrada antes de `GET /clients/:id` — senão MSW casaria "export" com `:id`.
  http.get(`${base}/clients/export`, () => {
    return HttpResponse.json({
      items: clients.map((c) => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        documento: c.documento,
        email: c.emails[0] ?? '',
        telefone: c.telefones[0] ?? '',
        celular: c.telefones[1] ?? '',
        criadoEm: c.criadoEm,
        atualizadoEm: c.ultimaMovimentacaoEm,
      })),
      truncado: false,
      limite: 5000,
    });
  }),

  http.post(`${base}/clients`, async ({ request }) => {
    const body = (await request.json()) as Partial<MockClient> & { responsavelId?: string };
    const created: MockClient = {
      id: `client-${clients.length + 1}`,
      nome: body.nome ?? 'Novo Cliente',
      nomeSocial: body.nomeSocial ?? null,
      razaoSocial: body.razaoSocial ?? null,
      tipo: body.tipo ?? 'PESSOA_FISICA',
      categoriaRelacionamento: body.categoriaRelacionamento ?? 'CLIENTE',
      avatarUrl: body.avatarUrl ?? null,
      documento: null,
      emails: body.emails ?? [],
      telefones: body.telefones ?? [],
      telefoneResidencial: body.telefoneResidencial ?? null,
      telefoneResponsavel: body.telefoneResponsavel ?? null,
      enderecoLogradouro: body.enderecoLogradouro ?? null,
      enderecoNumero: body.enderecoNumero ?? null,
      enderecoComplemento: body.enderecoComplemento ?? null,
      enderecoBairro: body.enderecoBairro ?? null,
      enderecoCidade: body.enderecoCidade ?? null,
      enderecoUf: body.enderecoUf ?? null,
      enderecoCep: body.enderecoCep ?? null,
      observacoes: body.observacoes ?? null,
      status: 'ATIVO',
      processosAtivos: 0,
      responsavel: resolveResponsavel(body.responsavelId) ?? null,
      responsavelNome: body.responsavelNome ?? null,
      ultimaMovimentacaoEm: new Date().toISOString(),
      nomeMae: body.nomeMae ?? null,
      rg: body.rg ?? null,
      nomePai: body.nomePai ?? null,
      estadoCivil: body.estadoCivil ?? null,
      profissao: body.profissao ?? null,
      dataNascimento: body.dataNascimento ?? null,
      camposExtrasValores: body.camposExtrasValores ?? {},
      criadoEm: new Date().toISOString(),
    };
    clients = [created, ...clients];
    return HttpResponse.json({ cliente: { id: created.id }, avisos: [] }, { status: 201 });
  }),

  http.get(`${base}/clients/:id`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    return HttpResponse.json({
      ...publicClient(client),
      cpf: client.tipo === 'PESSOA_FISICA' ? client.documento : null,
      cnpj: client.tipo === 'PESSOA_JURIDICA' ? client.documento : null,
      atualizadoEm: client.ultimaMovimentacaoEm,
      documentosCount: 0,
      favorito: favoritos.has(client.id),
    });
  }),

  http.get(`${base}/clients/:id/timeline`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    if (client.processosAtivos === 0) return HttpResponse.json({ items: [], nextCursor: null });
    return HttpResponse.json({
      items: [
        {
          id: 'evento-1',
          tipo: 'CLIENTE_ATUALIZADO',
          titulo: `Dados do cliente ${client.nome} foram atualizados`,
          descricao: null,
          dataEvento: client.ultimaMovimentacaoEm,
          origem: 'SISTEMA',
          autor: null,
          entidadeRelacionada: { tipo: 'cliente', id: client.id },
          fixado: false,
          editavel: false,
        },
      ],
      nextCursor: null,
    });
  }),

  http.post(`${base}/clients/:id/favorite`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const id = client.id;
    const favorito = !favoritos.has(id);
    if (favorito) favoritos.add(id);
    else favoritos.delete(id);
    return HttpResponse.json({ favorito });
  }),

  http.patch(`${base}/clients/:id`, async ({ params, request }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const body = (await request.json()) as Partial<MockClient> & { responsavelId?: string };
    const { responsavelId, ...rest } = body;
    Object.assign(client, rest);
    if (responsavelId !== undefined) client.responsavel = resolveResponsavel(responsavelId) ?? null;
    return HttpResponse.json({ avisos: [] });
  }),

  http.delete(`${base}/clients/:id`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    if (client.processosAtivos > 0) {
      return problem(409, 'HAS_ACTIVE_LEGAL_CASES', 'Este cliente possui processos vinculados.');
    }
    clients = clients.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/clients/:id/archive`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    client.status = 'INATIVO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/clients/:id/restore`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    client.status = 'ATIVO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/clients/:id/duplicate`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const copy: MockClient = {
      ...client,
      id: `${client.id}-copia`,
      nome: `${client.nome} (cópia)`,
    };
    clients = [copy, ...clients];
    return HttpResponse.json({ id: copy.id }, { status: 201 });
  }),

  http.get(`${base}/clients/:id/legal-cases`, ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    if (client.processosAtivos === 0) return HttpResponse.json([]);
    return HttpResponse.json([
      {
        id: 'case-1',
        titulo: 'Ação de cobrança',
        numeroCnj: null,
        status: 'ATIVO',
        prioridade: 'MEDIA',
        proximaDataRelevante: null,
        versao: 1,
      },
    ]);
  }),
];
