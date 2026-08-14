import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/
 * configuration/` (Configuration Engine, Prompt 13). Usados só em teste
 * (Vitest); modo `dev:mock` tem seu próprio conjunto em `mocks/demo/handlers.ts`.
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'mock-correlation-id',
      timestamp: new Date(0).toISOString(),
    },
    { status },
  );
}

interface ExtraFieldMock {
  id: string;
  entidade: string;
  nome: string;
  chave: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes: string[];
  valorPadrao: string | null;
  ordem: number;
  ativo: boolean;
}

export const LEGAL_FOLDER_EXTRA_FIELDS: ExtraFieldMock[] = [
  ['Data do Atendimento', 'data_atendimento', 'DATA', []],
  [
    'Tipo de Atendimento',
    'tipo_atendimento',
    'SELECT',
    ['Online', 'Outros', 'Presencial', 'Em Sindicato'],
  ],
  ['Advogado Atendente', 'advogado_atendente', 'TEXTO', []],
  [
    'Sub Área',
    'sub_area',
    'SELECT',
    [
      'Acidentária',
      'Acidente de Trabalho',
      'Aposentadoria',
      'Auxílio-doença',
      'Cível',
      'Consumo',
      'Criminal',
      'Defesa da Multa',
      'FGTS',
      'Outros Benefícios Previdenciários',
      'Previdenciária Bancária',
      'Público',
      'Responsabilidade Civil',
      'Seguro',
    ],
  ],
  ['Setor Comercial', 'setor_comercial', 'BOOLEANO', []],
  [
    'Quem indicou?',
    'quem_indicou',
    'SELECT',
    [
      'Advogados Externos',
      'Área Cível',
      'Asseio',
      'Indicado por Cliente',
      'Já é Cliente',
      'Mídias Sociais',
      'Parceiro',
      'Pós-venda',
      'Prospecção',
    ],
  ],
  ['Parceiro Quem?', 'parceiro_quem', 'TEXTO', []],
  ['Núcleos', 'nucleos', 'SELECT', ['Bancário', 'Civil', 'Concorde', 'FAP']],
  ['Nº da Pasta Física - Migração', 'numero_pasta_fisica', 'NUMERO', []],
  ['Assistente Técnico', 'assistente_tecnico', 'TEXTO', []],
  ['High Ticket', 'high_ticket', 'BOOLEANO', []],
  ['Outras Anotações', 'outras_anotacoes', 'TEXTAREA', []],
].map(([nome, chave, tipo, opcoes], index) => ({
  id: `pasta-extra-${index + 1}`,
  entidade: 'PASTA_JURIDICA',
  nome: nome as string,
  chave: chave as string,
  tipo: tipo as string,
  obrigatorio: [
    'data_atendimento',
    'tipo_atendimento',
    'advogado_atendente',
    'sub_area',
    'setor_comercial',
    'quem_indicou',
    'high_ticket',
  ].includes(chave as string),
  opcoes: opcoes as string[],
  valorPadrao: null,
  ordem: index + 1,
  ativo: true,
}));

interface ValueSetItemMock {
  id: string;
  valor: string;
  ordem: number;
  ativo: boolean;
}

interface ValueSetMock {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  itens: ValueSetItemMock[];
}

interface TaskCategoryMock {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

interface CollaboratorGroupMock {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  membros: Array<{ id: string; nome: string }>;
}

interface CargoMock {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

/** IDs fixos (não gerados) — `mocks/handlers/team.ts` referencia estes
 * mesmos IDs no campo `cargo` dos colaboradores mockados, para que um
 * filtro por cargo na listagem realmente combine com o catálogo. */
export const MOCK_CARGO_ADVOGADO_ID = 'cargo-seed-advogado';
export const MOCK_CARGO_ADVOGADO_SENIOR_ID = 'cargo-seed-advogado-senior';
export const MOCK_CARGO_ESTAGIARIO_ID = 'cargo-seed-estagiario';
export const MOCK_CARGO_ANALISTA_ADM_ID = 'cargo-seed-analista-adm';

interface TaskTemplateMock {
  id: string;
  nome: string;
  descricao: string | null;
  categoriaId: string | null;
  categoria: { id: string; nome: string; cor: string } | null;
  prazoDiasPadrao: number;
  prioridadePadrao: string;
  checklist: string[];
  ativo: boolean;
}

interface HolidayMock {
  id: string;
  nome: string;
  data: string;
  tipo: string;
  uf: string | null;
  recorrenteAnual: boolean;
  ativo: boolean;
}

function initialState() {
  return {
    general: {
      fusoHorario: 'America/Sao_Paulo',
      idioma: 'pt-BR',
      formatoData: 'DD/MM/YYYY',
      moedaPadrao: 'BRL',
      diaInicioSemana: 1,
      notificacoesPadrao: true,
    },
    financial: {
      formaCalculoHonorarioPadrao: 'FIXO',
      percentualHonorarioPadrao: null as number | null,
      diasVencimentoPadrao: 30,
    },
    ai: {
      providerPadrao: 'fake',
      modeloPadrao: null as string | null,
      cotaMensalPersonalizada: null as number | null,
      exigirRevisaoHumana: false,
    },
    extraFields: [
      ...LEGAL_FOLDER_EXTRA_FIELDS,
      {
        id: 'campo-extra-1',
        entidade: 'CLIENTE',
        nome: 'Data de Nascimento',
        chave: 'data_nascimento',
        tipo: 'DATA',
        obrigatorio: false,
        opcoes: [],
        valorPadrao: null,
        ordem: 0,
        ativo: true,
      },
    ] as ExtraFieldMock[],
    requiredFields: [{ entidade: 'CLIENTE', campo: 'enderecoLogradouro', obrigatorio: false }],
    valueSets: [
      {
        id: 'conjunto-1',
        nome: 'Área do Direito',
        descricao: 'Áreas de atuação do escritório',
        ativo: true,
        itens: [{ id: 'item-1', valor: 'Cível', ordem: 0, ativo: true }],
      },
    ] as ValueSetMock[],
    taskCategories: [
      { id: 'categoria-1', nome: 'Prazos Fatais', cor: '#EF4444', ordem: 0, ativo: true },
    ] as TaskCategoryMock[],
    collaboratorGroups: [
      {
        id: 'grupo-1',
        nome: 'Equipe Cível',
        descricao: null,
        ativo: true,
        membros: [{ id: 'mock-membro-1', nome: 'Usuária Mock' }],
      },
    ] as CollaboratorGroupMock[],
    cargos: [
      { id: MOCK_CARGO_ADVOGADO_ID, nome: 'Advogado', descricao: null, ordem: 0, ativo: true },
      {
        id: MOCK_CARGO_ADVOGADO_SENIOR_ID,
        nome: 'Advogado Sênior',
        descricao: null,
        ordem: 1,
        ativo: true,
      },
      { id: MOCK_CARGO_ESTAGIARIO_ID, nome: 'Estagiário', descricao: null, ordem: 2, ativo: true },
      {
        id: MOCK_CARGO_ANALISTA_ADM_ID,
        nome: 'Analista Administrativo',
        descricao: null,
        ordem: 3,
        ativo: true,
      },
    ] as CargoMock[],
    taskTemplates: [
      {
        id: 'modelo-1',
        nome: 'Contestação Padrão',
        descricao: null,
        categoriaId: 'categoria-1',
        categoria: { id: 'categoria-1', nome: 'Prazos Fatais', cor: '#EF4444' },
        prazoDiasPadrao: 15,
        prioridadePadrao: 'ALTA',
        checklist: ['Revisar fatos', 'Anexar documentos'],
        ativo: true,
      },
    ] as TaskTemplateMock[],
    holidays: [
      {
        id: 'feriado-1',
        nome: 'Natal',
        data: '2026-12-25',
        tipo: 'NACIONAL',
        uf: null,
        recorrenteAnual: true,
        ativo: true,
      },
    ] as HolidayMock[],
  };
}

let state = initialState();

export function resetConfigurationMocks() {
  state = initialState();
}

let nextId = 1;
function generateId(prefix: string) {
  return `${prefix}-mock-${nextId++}`;
}

export const configurationHandlers = [
  http.get(`${base}/configuration/dashboard-summary`, () =>
    HttpResponse.json({
      quantidadeCamposExtra: state.extraFields.length,
      quantidadeCategorias: state.taskCategories.length,
      quantidadeConjuntos: state.valueSets.length,
      quantidadeModelos: state.taskTemplates.length,
      quantidadeGrupos: state.collaboratorGroups.length,
      quantidadeUsuarios: 3,
      quantidadeProvidersIa: 5,
      consumoIa: {
        mesReferencia: '2026-08',
        resumosGerados: 4,
        cotaMensal: 20,
        custoEstimadoCentavosTotal: 120,
      },
      ultimasAlteracoes: [
        {
          id: 'log-1',
          acao: 'CREATE_EXTRA_FIELD',
          recursoTipo: 'CAMPO_EXTRA',
          recursoId: 'campo-extra-1',
          atorId: 'mock-user-1',
          criadoEm: new Date('2026-08-01T10:00:00.000Z').toISOString(),
        },
      ],
    }),
  ),

  http.get(`${base}/configuration/general`, () => HttpResponse.json(state.general)),
  http.patch(`${base}/configuration/general`, async ({ request }) => {
    state.general = { ...state.general, ...((await request.json()) as object) };
    return HttpResponse.json(state.general);
  }),

  http.get(`${base}/configuration/financial`, () => HttpResponse.json(state.financial)),
  http.patch(`${base}/configuration/financial`, async ({ request }) => {
    state.financial = { ...state.financial, ...((await request.json()) as object) };
    return HttpResponse.json(state.financial);
  }),

  http.get(`${base}/configuration/ai`, () =>
    HttpResponse.json({
      ...state.ai,
      providersDisponiveis: ['fake', 'openai', 'anthropic', 'gemini', 'ollama'],
    }),
  ),
  http.patch(`${base}/configuration/ai`, async ({ request }) => {
    state.ai = { ...state.ai, ...((await request.json()) as object) };
    return HttpResponse.json({
      ...state.ai,
      providersDisponiveis: ['fake', 'openai', 'anthropic', 'gemini', 'ollama'],
    });
  }),

  http.get(`${base}/configuration/extra-fields`, ({ request }) => {
    const entidade = new URL(request.url).searchParams.get('entidade');
    const items = entidade
      ? state.extraFields.filter((f) => f.entidade === entidade)
      : state.extraFields;
    return HttpResponse.json(items);
  }),
  http.post(`${base}/configuration/extra-fields`, async ({ request }) => {
    const body = (await request.json()) as Omit<ExtraFieldMock, 'id' | 'ativo'>;
    if (state.extraFields.some((f) => f.entidade === body.entidade && f.chave === body.chave)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um campo com esta chave.');
    }
    const id = generateId('campo-extra');
    state.extraFields.push({ ...body, id, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/extra-fields/:id`, async ({ params, request }) => {
    const field = state.extraFields.find((f) => f.id === params.id);
    if (!field) return problem(404, 'NOT_FOUND', 'Campo extra não encontrado.');
    Object.assign(field, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/extra-fields/:id`, ({ params }) => {
    const index = state.extraFields.findIndex((f) => f.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Campo extra não encontrado.');
    state.extraFields.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/required-fields`, () => HttpResponse.json(state.requiredFields)),
  http.patch(`${base}/configuration/required-fields`, async ({ request }) => {
    const body = (await request.json()) as {
      itens: Array<{ entidade: string; campo: string; obrigatorio: boolean }>;
    };
    for (const item of body.itens) {
      const existing = state.requiredFields.find(
        (f) => f.entidade === item.entidade && f.campo === item.campo,
      );
      if (existing) existing.obrigatorio = item.obrigatorio;
      else state.requiredFields.push(item);
    }
    return HttpResponse.json(state.requiredFields);
  }),

  http.get(`${base}/configuration/value-sets`, () => HttpResponse.json(state.valueSets)),
  http.post(`${base}/configuration/value-sets`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string };
    if (state.valueSets.some((v) => v.nome === body.nome)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um conjunto com este nome.');
    }
    const id = generateId('conjunto');
    state.valueSets.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ativo: true,
      itens: [],
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/value-sets/:id`, async ({ params, request }) => {
    const conjunto = state.valueSets.find((v) => v.id === params.id);
    if (!conjunto) return problem(404, 'NOT_FOUND', 'Conjunto não encontrado.');
    Object.assign(conjunto, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/value-sets/:id`, ({ params }) => {
    const index = state.valueSets.findIndex((v) => v.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Conjunto não encontrado.');
    state.valueSets.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/configuration/value-sets/:id/items`, async ({ params, request }) => {
    const conjunto = state.valueSets.find((v) => v.id === params.id);
    if (!conjunto) return problem(404, 'NOT_FOUND', 'Conjunto não encontrado.');
    const body = (await request.json()) as { valor: string; ordem?: number };
    const id = generateId('item');
    conjunto.itens.push({ id, valor: body.valor, ordem: body.ordem ?? 0, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.delete(`${base}/configuration/value-sets/:id/items/:itemId`, ({ params }) => {
    const conjunto = state.valueSets.find((v) => v.id === params.id);
    if (!conjunto) return problem(404, 'NOT_FOUND', 'Conjunto não encontrado.');
    conjunto.itens = conjunto.itens.filter((i) => i.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/task-categories`, () => HttpResponse.json(state.taskCategories)),
  http.post(`${base}/configuration/task-categories`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; cor?: string };
    if (state.taskCategories.some((c) => c.nome === body.nome)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe uma categoria com este nome.');
    }
    const id = generateId('categoria');
    state.taskCategories.push({
      id,
      nome: body.nome,
      cor: body.cor ?? '#6366F1',
      ordem: 0,
      ativo: true,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/task-categories/:id`, async ({ params, request }) => {
    const categoria = state.taskCategories.find((c) => c.id === params.id);
    if (!categoria) return problem(404, 'NOT_FOUND', 'Categoria não encontrada.');
    Object.assign(categoria, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/task-categories/:id`, ({ params }) => {
    const index = state.taskCategories.findIndex((c) => c.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Categoria não encontrada.');
    state.taskCategories.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/collaborator-groups`, () =>
    HttpResponse.json(state.collaboratorGroups),
  ),
  http.post(`${base}/configuration/collaborator-groups`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string };
    if (state.collaboratorGroups.some((g) => g.nome === body.nome)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um grupo com este nome.');
    }
    const id = generateId('grupo');
    state.collaboratorGroups.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ativo: true,
      membros: [],
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/collaborator-groups/:id`, async ({ params, request }) => {
    const grupo = state.collaboratorGroups.find((g) => g.id === params.id);
    if (!grupo) return problem(404, 'NOT_FOUND', 'Grupo não encontrado.');
    Object.assign(grupo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/collaborator-groups/:id`, ({ params }) => {
    const index = state.collaboratorGroups.findIndex((g) => g.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Grupo não encontrado.');
    state.collaboratorGroups.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(
    `${base}/configuration/collaborator-groups/:id/members`,
    async ({ params, request }) => {
      const grupo = state.collaboratorGroups.find((g) => g.id === params.id);
      if (!grupo) return problem(404, 'NOT_FOUND', 'Grupo não encontrado.');
      const body = (await request.json()) as { membroId: string };
      if (!grupo.membros.some((m) => m.id === body.membroId)) {
        grupo.membros.push({ id: body.membroId, nome: 'Usuária Mock' });
      }
      return new HttpResponse(null, { status: 201 });
    },
  ),
  http.delete(`${base}/configuration/collaborator-groups/:id/members/:membroId`, ({ params }) => {
    const grupo = state.collaboratorGroups.find((g) => g.id === params.id);
    if (!grupo) return problem(404, 'NOT_FOUND', 'Grupo não encontrado.');
    grupo.membros = grupo.membros.filter((m) => m.id !== params.membroId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/cargos`, () => HttpResponse.json(state.cargos)),
  http.post(`${base}/configuration/cargos`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string; ordem?: number };
    if (state.cargos.some((c) => c.nome === body.nome)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um cargo com este nome.');
    }
    const id = generateId('cargo');
    state.cargos.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ordem: body.ordem ?? 0,
      ativo: true,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/cargos/:id`, async ({ params, request }) => {
    const cargo = state.cargos.find((c) => c.id === params.id);
    if (!cargo) return problem(404, 'NOT_FOUND', 'Cargo não encontrado.');
    Object.assign(cargo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/cargos/:id`, ({ params }) => {
    const index = state.cargos.findIndex((c) => c.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Cargo não encontrado.');
    state.cargos.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/task-templates`, () => HttpResponse.json(state.taskTemplates)),
  http.post(`${base}/configuration/task-templates`, async ({ request }) => {
    const body = (await request.json()) as Omit<TaskTemplateMock, 'id' | 'categoria' | 'ativo'>;
    if (state.taskTemplates.some((t) => t.nome === body.nome)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um modelo com este nome.');
    }
    const categoria = state.taskCategories.find((c) => c.id === body.categoriaId) ?? null;
    const id = generateId('modelo');
    state.taskTemplates.push({ ...body, id, categoria, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/task-templates/:id`, async ({ params, request }) => {
    const modelo = state.taskTemplates.find((t) => t.id === params.id);
    if (!modelo) return problem(404, 'NOT_FOUND', 'Modelo não encontrado.');
    Object.assign(modelo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/task-templates/:id`, ({ params }) => {
    const index = state.taskTemplates.findIndex((t) => t.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Modelo não encontrado.');
    state.taskTemplates.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/holidays`, () => HttpResponse.json(state.holidays)),
  http.post(`${base}/configuration/holidays`, async ({ request }) => {
    const body = (await request.json()) as Omit<HolidayMock, 'id' | 'ativo'>;
    if (state.holidays.some((h) => h.nome === body.nome && h.data === body.data)) {
      return problem(409, 'DUPLICATE_NAME', 'Já existe um feriado com este nome nesta data.');
    }
    const id = generateId('feriado');
    state.holidays.push({ ...body, id, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/holidays/:id`, async ({ params, request }) => {
    const feriado = state.holidays.find((h) => h.id === params.id);
    if (!feriado) return problem(404, 'NOT_FOUND', 'Feriado não encontrado.');
    Object.assign(feriado, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/holidays/:id`, ({ params }) => {
    const index = state.holidays.findIndex((h) => h.id === params.id);
    if (index === -1) return problem(404, 'NOT_FOUND', 'Feriado não encontrado.');
    state.holidays.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
