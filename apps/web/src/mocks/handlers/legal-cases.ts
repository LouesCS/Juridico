import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/legal-cases/`
 * (módulo real nesta rodada — Prompt 7). Usados só em teste (Vitest).
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

interface MockLegalCase {
  id: string;
  titulo: string;
  numeroInterno: string | null;
  instituicao?: string | null;
  numeroBeneficio?: string | null;
  roNumeroBeneficio?: string | null;
  dataDistribuicao: string | null;
  dataEncerramento: string | null;
  numeroCnj: string | null;
  status: string;
  prioridade: string;
  area: string;
  tipoAcao?: string | null;
  tribunal: string | null;
  comarca: string | null;
  vara?: string | null;
  instancia?: string | null;
  poloCliente?: string;
  segredoJustica: boolean;
  cliente: { id: string; nome: string };
  pastaJuridica: {
    id: string;
    nome: string;
    numeroInterno?: string | null;
    clientePrincipal?: { id: string; nome: string };
    parteContrariaPrincipal?: { id: string; nome: string } | null;
    encarregado?: { id: string; nome: string; usuario: { nome: string } } | null;
  } | null;
  autorPrincipal: null;
  reuPrincipal: null;
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
  proximaDataRelevante: string | null;
  ultimaAtualizacaoEm: string;
  versao: number;
  tipo: 'JUDICIAL' | 'EXTRAJUDICIAL';
}

interface MockCaseDeadline {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  dataVencimento: string;
  responsavelId: string;
  prioridade: string;
  status: string;
  motivoCancelamento: string | null;
}

let cases: MockLegalCase[] = [];
let team: Array<{
  id: string;
  membroId: string;
  nome: string;
  avatarUrl: string | null;
  funcaoNoProcesso: string | null;
  responsavelPrincipal: boolean;
  acessoPermitido: string;
  entrouEm: string;
}> = [];
let caseDeadlines: Record<string, MockCaseDeadline[]> = {};
let partiesByCase: Record<string, Array<Record<string, unknown>>> = {};

function seed() {
  cases = [
    {
      id: 'case-1',
      titulo: 'Ação de cobrança — Silva vs. Acme',
      numeroInterno: 'JUD-2026-001',
      dataDistribuicao: '2026-01-10',
      dataEncerramento: null,
      numeroCnj: '1234567-19.2024.8.26.0001',
      status: 'ATIVO',
      prioridade: 'ALTA',
      area: 'Cível',
      tipoAcao: 'Cobrança',
      tribunal: 'TJSP',
      comarca: 'São Paulo',
      vara: '1ª Vara Cível',
      instancia: 'PRIMEIRA',
      poloCliente: 'ATIVO',
      roNumeroBeneficio: null,
      segredoJustica: false,
      cliente: { id: 'client-1', nome: 'João da Silva' },
      pastaJuridica: {
        id: 'folder-1',
        nome: 'JOÃO DA SILVA/1',
        numeroInterno: 'JOÃO DA SILVA/1',
        clientePrincipal: { id: 'client-1', nome: 'João da Silva' },
        parteContrariaPrincipal: { id: 'client-2', nome: 'Instituto Previdenciário' },
        encarregado: { id: 'mock-membro-1', nome: 'Usuária', usuario: { nome: 'Usuária' } },
      },
      autorPrincipal: null,
      reuPrincipal: null,
      responsavel: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      proximaDataRelevante: '2026-08-15T00:00:00.000Z',
      ultimaAtualizacaoEm: '2026-07-20T00:00:00.000Z',
      versao: 1,
      tipo: 'JUDICIAL',
    },
    {
      id: 'case-sigiloso',
      titulo: 'Processo confidencial',
      numeroInterno: 'JUD-2026-002',
      dataDistribuicao: null,
      dataEncerramento: null,
      numeroCnj: null,
      status: 'ATIVO',
      prioridade: 'CRITICA',
      area: 'Família',
      tribunal: null,
      comarca: null,
      segredoJustica: true,
      cliente: { id: 'client-2', nome: 'Acme Ltda' },
      pastaJuridica: { id: 'folder-2', nome: 'ACME/1' },
      autorPrincipal: null,
      reuPrincipal: null,
      responsavel: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      proximaDataRelevante: null,
      ultimaAtualizacaoEm: '2026-07-10T00:00:00.000Z',
      versao: 1,
      tipo: 'JUDICIAL',
    },
    {
      id: 'case-extra-1',
      titulo: 'Negociação administrativa — Maria Oliveira',
      numeroInterno: '700123955',
      dataDistribuicao: '2026-08-06',
      dataEncerramento: null,
      numeroCnj: null,
      status: 'ATIVO',
      prioridade: 'MEDIA',
      area: 'Administrativo',
      tribunal: null,
      comarca: null,
      segredoJustica: false,
      cliente: { id: 'client-1', nome: 'João da Silva' },
      pastaJuridica: {
        id: 'folder-1',
        nome: 'JOÃO DA SILVA/1',
        numeroInterno: 'JOÃO DA SILVA/1',
        clientePrincipal: { id: 'client-1', nome: 'João da Silva' },
        parteContrariaPrincipal: { id: 'client-2', nome: 'Instituto Previdenciário' },
        encarregado: { id: 'mock-membro-1', nome: 'Usuária', usuario: { nome: 'Usuária' } },
      },
      autorPrincipal: null,
      reuPrincipal: null,
      responsavel: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      proximaDataRelevante: null,
      ultimaAtualizacaoEm: '2026-08-10T00:00:00.000Z',
      versao: 1,
      tipo: 'EXTRAJUDICIAL',
    },
  ];
  team = [
    {
      id: 'vinculo-1',
      membroId: 'mock-membro-1',
      nome: 'Usuária',
      avatarUrl: null,
      funcaoNoProcesso: null,
      responsavelPrincipal: true,
      acessoPermitido: 'LEITURA_ESCRITA',
      entrouEm: '2026-01-01T00:00:00.000Z',
    },
  ];
  caseDeadlines = {
    'case-1': [
      {
        id: 'prazo-1',
        titulo: 'Audiência de conciliação',
        descricao: null,
        tipo: 'AUDIENCIA',
        dataVencimento: '2026-08-15T00:00:00.000Z',
        responsavelId: 'mock-membro-1',
        prioridade: 'ALTA',
        status: 'PENDENTE',
        motivoCancelamento: null,
      },
    ],
  };
  partiesByCase = {
    'case-extra-1': [
      {
        id: 'party-1',
        tipo: 'AUTOR',
        natureza: 'PESSOA_FISICA',
        nome: 'João Carlos Donassolo',
        documento: null,
        clienteId: 'client-1',
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: true,
      },
      {
        id: 'party-2',
        tipo: 'AUTOR',
        natureza: 'PESSOA_FISICA',
        nome: 'Maria da Silva com um nome suficientemente longo para validar o truncamento responsivo',
        documento: null,
        clienteId: null,
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: false,
      },
      {
        id: 'party-3',
        tipo: 'REU',
        natureza: 'PESSOA_JURIDICA',
        nome: 'Instituto Nacional do Seguro Social',
        documento: null,
        clienteId: 'client-2',
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: true,
      },
      {
        id: 'party-4',
        tipo: 'TESTEMUNHA',
        natureza: 'PESSOA_FISICA',
        nome: 'Ana Testemunha',
        documento: null,
        clienteId: null,
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: false,
      },
    ],
    'case-1': [
      {
        id: 'jparty-1',
        tipo: 'AUTOR',
        natureza: 'PESSOA_FISICA',
        nome: 'João da Silva',
        documento: null,
        clienteId: 'client-1',
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: true,
      },
      {
        id: 'jparty-2',
        tipo: 'ADVOGADO_AUTOR',
        natureza: 'PESSOA_FISICA',
        nome: 'Dra. Beatriz Nunes',
        documento: null,
        clienteId: 'client-com-processo',
        oabNumero: '123456',
        oabUf: 'SP',
        observacoes: null,
        principal: true,
      },
      {
        id: 'jparty-3',
        tipo: 'REU',
        natureza: 'PESSOA_JURIDICA',
        nome: 'Acme Ltda',
        documento: null,
        clienteId: 'client-2',
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: true,
      },
      {
        id: 'jparty-4',
        tipo: 'JUIZ',
        natureza: 'PESSOA_FISICA',
        nome: 'Juiz Carlos Mendes',
        documento: null,
        clienteId: null,
        oabNumero: null,
        oabUf: null,
        observacoes: null,
        principal: false,
      },
    ],
  };
}

seed();

export function resetLegalCaseMocks() {
  seed();
}

/** Espelha o merge de `partes` feito pelos use cases agregados reais
 * (Extrajudicial/Judicial): reaproveita dados da parte existente por `id`,
 * ou resolve um nome conhecido a partir do `clienteId` para uma parte nova. */
function syncMockParties(
  caseId: string,
  partes: Array<{ id?: string; clienteId?: string; tipo: string; principal: boolean }>,
): Array<Record<string, unknown>> {
  const existing = partiesByCase[caseId] ?? [];
  const known: Record<string, string> = {
    'client-1': 'João da Silva',
    'client-2': 'Acme Ltda',
    'client-3': 'Maria Oliveira',
    'client-com-processo': 'Cliente Com Processo Ativo',
  };
  return partes.map((party, index) => {
    const old = party.id ? existing.find((item) => item.id === party.id) : undefined;
    return {
      ...(old ?? {}),
      id: party.id ?? `party-new-${index}`,
      clienteId: party.clienteId ?? (old?.clienteId as string | null) ?? null,
      nome: (old?.nome as string) ?? known[party.clienteId ?? ''] ?? 'Participante',
      natureza: (old?.natureza as string) ?? 'PESSOA_FISICA',
      documento: (old?.documento as string | null) ?? null,
      oabNumero: (old?.oabNumero as string | null) ?? null,
      oabUf: (old?.oabUf as string | null) ?? null,
      observacoes: null,
      tipo: party.tipo,
      principal: party.principal,
    };
  });
}

export const legalCasesHandlers = [
  http.get(`${base}/legal-cases/party-options`, ({ request }) => {
    const tipo = new URL(request.url).searchParams.get('tipo');
    return HttpResponse.json({
      items:
        tipo === 'REU'
          ? [
              {
                id: 'party-3',
                nome: 'Instituto Nacional do Seguro Social',
                tipo: 'REU',
                documento: null,
              },
            ]
          : [{ id: 'party-1', nome: 'João Carlos Donassolo', tipo: 'AUTOR', documento: null }],
      nextCursor: null,
    });
  }),
  http.get(`${base}/legal-cases`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const tipo = url.searchParams.get('tipo');
    const status = url.searchParams.get('status');
    const prioridade = url.searchParams.get('prioridade');
    const dataDistribuicaoDe = url.searchParams.get('dataDistribuicaoDe');
    const dataDistribuicaoAte = url.searchParams.get('dataDistribuicaoAte');
    const sort = url.searchParams.get('sort') ?? '-ultimaAtualizacaoEm';
    const byType = tipo ? cases.filter((c) => c.tipo === tipo) : cases;
    const filtered = byType.filter(
      (c) =>
        (!q || c.titulo.toLowerCase().includes(q) || c.numeroInterno?.toLowerCase().includes(q)) &&
        (!status || c.status === status) &&
        (!prioridade || c.prioridade === prioridade) &&
        (!dataDistribuicaoDe || (c.dataDistribuicao ?? '') >= dataDistribuicaoDe) &&
        (!dataDistribuicaoAte || (c.dataDistribuicao ?? '9999') <= dataDistribuicaoAte),
    );
    const field = sort.replace(/^-/, '') as keyof MockLegalCase;
    const desc = sort.startsWith('-');
    const sorted = [...filtered].sort((a, b) => {
      const av = String(a[field] ?? '');
      const bv = String(b[field] ?? '');
      return desc ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const withParties = sorted.map((c) => {
      const parties = partiesByCase[c.id] ?? [];
      const principal = (t: string) =>
        (parties.find((p) => p.tipo === t && p.principal) as
          | { id: string; nome: string; clienteId: string | null }
          | undefined) ?? null;
      return {
        ...c,
        autorPrincipal: principal('AUTOR'),
        reuPrincipal: principal('REU'),
        advogadoPrincipalAutor: principal('ADVOGADO_AUTOR'),
        advogadoPrincipalReu: principal('ADVOGADO_REU'),
      };
    });
    return HttpResponse.json({ items: withParties, nextCursor: null, total: withParties.length });
  }),

  http.post(`${base}/legal-cases`, async ({ request }) => {
    const body = (await request.json()) as {
      titulo?: string;
      numeroCnj?: string;
      clienteId?: string;
    };
    const numeroCnjDigits = body.numeroCnj?.replace(/\D/g, '');
    if (numeroCnjDigits === '12345671920248260001') {
      return problem(409, 'DUPLICATE_CNJ', 'Já existe um processo com este número.', {
        processoExistenteId: 'case-1',
      });
    }
    const created: MockLegalCase = {
      id: `case-${cases.length + 1}`,
      titulo: body.titulo ?? 'Novo processo',
      numeroInterno: null,
      dataDistribuicao: null,
      dataEncerramento: null,
      numeroCnj: numeroCnjDigits ?? null,
      status: 'ATIVO',
      prioridade: 'MEDIA',
      area: 'Cível',
      tribunal: null,
      comarca: null,
      segredoJustica: false,
      cliente: { id: body.clienteId ?? 'client-1', nome: 'Cliente' },
      pastaJuridica: { id: 'folder-new', nome: 'PASTA/1' },
      autorPrincipal: null,
      reuPrincipal: null,
      responsavel: null,
      proximaDataRelevante: null,
      ultimaAtualizacaoEm: new Date().toISOString(),
      versao: 1,
      tipo: 'JUDICIAL',
    };
    cases = [created, ...cases];
    return HttpResponse.json({ id: created.id }, { status: 201 });
  }),

  http.get(`${base}/legal-cases/:id`, ({ params }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    return HttpResponse.json({
      ...legalCase,
      descricao: null,
      numeroInterno: legalCase.numeroInterno,
      tipoAcao: legalCase.tipoAcao ?? null,
      tipo: legalCase.tipo,
      vara: legalCase.vara ?? null,
      uf: null,
      instancia: legalCase.instancia ?? null,
      classeProcessual: null,
      assunto: null,
      poloCliente: legalCase.poloCliente ?? 'ATIVO',
      roNumeroBeneficio: legalCase.roNumeroBeneficio ?? null,
      valorCausaCentavos: null,
      moedaValorCausa: 'BRL',
      dataDistribuicao: legalCase.dataDistribuicao,
      dataEncerramento: legalCase.dataEncerramento,
      observacoes: null,
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: legalCase.ultimaAtualizacaoEm,
      arquivadoEm: null,
      resumoIaVigente: null,
      tagsAtivas: [],
    });
  }),

  http.patch(`${base}/legal-cases/:id/extrajudicial`, async ({ params, request }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    if (request.headers.get('if-match') !== String(legalCase.versao))
      return problem(409, 'STALE_VERSION', 'Este processo foi atualizado por outra pessoa.');
    const body = (await request.json()) as {
      processo: Partial<MockLegalCase>;
      partes: Array<{ id?: string; clienteId?: string; tipo: string; principal: boolean }>;
    };
    Object.assign(legalCase, body.processo);
    partiesByCase[params.id as string] = syncMockParties(
      params.id as string,
      body.partes,
    );
    legalCase.versao += 1;
    return HttpResponse.json({ versao: legalCase.versao });
  }),

  http.patch(`${base}/legal-cases/:id/judicial`, async ({ params, request }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    if (request.headers.get('if-match') !== String(legalCase.versao))
      return problem(409, 'STALE_VERSION', 'Este processo foi atualizado por outra pessoa.');
    const body = (await request.json()) as {
      processo: Partial<MockLegalCase>;
      partes: Array<{ id?: string; clienteId?: string; tipo: string; principal: boolean }>;
    };
    Object.assign(legalCase, body.processo);
    partiesByCase[params.id as string] = syncMockParties(
      params.id as string,
      body.partes,
    );
    legalCase.versao += 1;
    return HttpResponse.json({ versao: legalCase.versao });
  }),

  http.patch(`${base}/legal-cases/:id`, async ({ params, request }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    const ifMatch = request.headers.get('if-match');
    if (ifMatch !== String(legalCase.versao)) {
      return problem(409, 'STALE_VERSION', 'Este processo foi atualizado por outra pessoa.');
    }
    const body = (await request.json()) as Partial<MockLegalCase>;
    Object.assign(legalCase, body);
    legalCase.versao += 1;
    return HttpResponse.json({ versao: legalCase.versao });
  }),

  http.delete(`${base}/legal-cases/:id`, ({ params }) => {
    cases = cases.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/legal-cases/:id/archive`, ({ params }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (legalCase) legalCase.status = 'ARQUIVADO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/legal-cases/:id/restore`, ({ params }) => {
    const legalCase = cases.find((c) => c.id === params.id);
    if (legalCase) legalCase.status = 'ATIVO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/legal-cases/:id/team`, ({ params }) => {
    if (!cases.find((c) => c.id === params.id))
      return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    return HttpResponse.json(team);
  }),

  http.post(`${base}/legal-cases/:id/team`, async ({ request }) => {
    const body = (await request.json()) as { membroId?: string };
    const novo = {
      id: `vinculo-${team.length + 1}`,
      membroId: body.membroId ?? 'membro-x',
      nome: 'Membro Adicionado',
      avatarUrl: null,
      funcaoNoProcesso: null,
      responsavelPrincipal: false,
      acessoPermitido: 'LEITURA_ESCRITA',
      entrouEm: new Date().toISOString(),
    };
    team = [...team, novo];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),

  http.patch(`${base}/legal-cases/:id/responsible`, async ({ request }) => {
    const body = (await request.json()) as { membroId?: string };
    team = team.map((t) => ({ ...t, responsavelPrincipal: t.membroId === body.membroId }));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/legal-cases/:id/team/:membroId`, ({ params }) => {
    team = team.filter((t) => t.membroId !== params.membroId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/legal-cases/:id/parties`, ({ params }) =>
    HttpResponse.json(partiesByCase[params.id as string] ?? []),
  ),

  /* legacy fixture retained below only as source documentation
        [
            {
              id: 'party-1',
              tipo: 'AUTOR',
              natureza: 'PESSOA_FISICA',
              nome: 'João Carlos Donassolo',
              documento: null,
              clienteId: 'client-1',
              oabNumero: null,
              oabUf: null,
              observacoes: null,
              principal: true,
            },
            {
              id: 'party-2',
              tipo: 'AUTOR',
              natureza: 'PESSOA_FISICA',
              nome: 'Maria da Silva com um nome suficientemente longo para validar o truncamento responsivo',
              documento: null,
              clienteId: null,
              oabNumero: null,
              oabUf: null,
              observacoes: null,
              principal: false,
            },
            {
              id: 'party-3',
              tipo: 'REU',
              natureza: 'PESSOA_JURIDICA',
              nome: 'Instituto Nacional do Seguro Social',
              documento: null,
              clienteId: 'client-2',
              oabNumero: null,
              oabUf: null,
              observacoes: null,
              principal: true,
            },
            {
              id: 'party-4',
              tipo: 'TESTEMUNHA',
              natureza: 'PESSOA_FISICA',
              nome: 'Ana Testemunha',
              documento: null,
              clienteId: null,
              oabNumero: null,
              oabUf: null,
              observacoes: null,
              principal: false,
            },
          ]
        ] */

  http.patch(
    `${base}/legal-cases/:id/parties/:parteId`,
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.get(`${base}/legal-cases/:id/deadlines`, ({ params }) => {
    if (!cases.find((c) => c.id === params.id))
      return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    return HttpResponse.json(caseDeadlines[params.id as string] ?? []);
  }),

  http.post(`${base}/legal-cases/:id/deadlines`, async ({ params, request }) => {
    const caseId = params.id as string;
    const body = (await request.json()) as Record<string, unknown>;
    caseDeadlines[caseId] = caseDeadlines[caseId] ?? [];
    const novo = {
      id: `prazo-${caseDeadlines[caseId].length + 1}`,
      titulo: (body.titulo as string) ?? 'Novo prazo',
      descricao: (body.descricao as string) ?? null,
      tipo: (body.tipo as string) ?? 'TAREFA',
      dataVencimento: (body.dataVencimento as string) ?? new Date().toISOString(),
      responsavelId: (body.responsavelId as string) ?? 'mock-membro-1',
      prioridade: (body.prioridade as string) ?? 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    };
    caseDeadlines[caseId] = [...caseDeadlines[caseId], novo];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),

  http.patch(`${base}/legal-cases/:id/deadlines/:prazoId`, async ({ params, request }) => {
    const prazo = (caseDeadlines[params.id as string] ?? []).find((p) => p.id === params.prazoId);
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    Object.assign(prazo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/legal-cases/:id/deadlines/:prazoId`, ({ params }) => {
    const prazo = (caseDeadlines[params.id as string] ?? []).find((p) => p.id === params.prazoId);
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    if (prazo.tipo === 'FATAL' && !prazo.motivoCancelamento) {
      return problem(422, 'JUSTIFICATION_REQUIRED', 'Cancelar um prazo fatal exige justificativa.');
    }
    prazo.status = 'CANCELADO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/complete`, ({ params }) => {
    const prazo = (caseDeadlines[params.id as string] ?? []).find((p) => p.id === params.prazoId);
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    prazo.status = 'CONCLUIDO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/reopen`, ({ params }) => {
    const prazo = (caseDeadlines[params.id as string] ?? []).find((p) => p.id === params.prazoId);
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    prazo.status = 'PENDENTE';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/duplicate`, ({ params }) => {
    const caseId = params.id as string;
    const original = (caseDeadlines[caseId] ?? []).find((p) => p.id === params.prazoId);
    if (!original) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    const copia = {
      ...original,
      id: `${original.id}-copia`,
      titulo: `${original.titulo} (cópia)`,
      status: 'PENDENTE',
    };
    caseDeadlines[caseId] = [...caseDeadlines[caseId], copia];
    return HttpResponse.json({ id: copia.id }, { status: 201 });
  }),
];
