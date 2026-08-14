import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import { judicialCaptureHandlers } from '../handlers/judicial-capture';
import { publicationsHandlers } from '../handlers/publications';
import { judicialMovementsHandlers } from '../handlers/judicial-movements';
import { extrajudicialMovementsHandlers } from '../handlers/extrajudicial-movements';
import { requestsHandlers } from '../handlers/requests';
import { legalFoldersHandlers } from '../handlers/legal-folders';
import { auditHandlers } from '../handlers/audit';

/**
 * Handlers EXCLUSIVOS do modo demonstração (`npm run dev:mock`) —
 * deliberadamente separados de `mocks/handlers/*.ts` (fixtures usadas
 * pelo Vitest, com valores fixos que os testes já verificam) para que
 * enriquecer os dados aqui nunca quebre um teste. Nada aqui é consumido
 * por `mocks/server.ts`. Reafirma docs/frontend-implementation/
 * 19-decisions.md — dados fictícios, só para navegação visual, nunca
 * enviados a um backend real.
 *
 * Credenciais de demonstração: `demo@quilombodev.com` / qualquer senha
 * (login sempre aceito para este e-mail nesta rodada — o objetivo é uma
 * demonstração fluida, não validar senha real).
 */
const base = env.NEXT_PUBLIC_API_URL;

const DEMO_OFFICE = { id: 'demo-office-1', nome: 'Silva & Associados', slug: 'silva-associados' };
const DEMO_USER = {
  id: 'demo-user-1',
  nome: 'João',
  sobrenome: 'Silva',
  email: 'demo@quilombodev.com',
  avatarUrl: null as string | null,
  tema: null as string | null,
  idioma: null as string | null,
};
const DEMO_MEMBRO_ID = 'demo-membro-1';
const DEMO_PERMISSIONS = [
  'office:read',
  'office:update',
  'member:read',
  'member:invite',
  'member:remove',
  'member:update-role',
  // Sprint "Colaboradores" — mesmo racional de `mocks/handlers/identity.ts`.
  'member:create',
  'member:update',
  'member:export',
  'client:create',
  'client:read',
  'client:update',
  'client:delete',
  'client:export',
  'case:create',
  'case:read:all',
  'case:update',
  'case:delete',
  'case:team:manage',
  'case:read:confidential',
  'document:create',
  'document:read:all',
  'document:update',
  'document:delete',
  'document:download',
  'legal-folder:create',
  'legal-folder:read:all',
  'legal-folder:read:team',
  'legal-folder:read:assigned',
  'legal-folder:update',
  'legal-folder:delete',
  'ai:summarize',
  'ai:usage:read',
  // Permission Engine (Prompt 12) — OWNER de demonstração ganha as 4
  // permissões novas para o modo demo mostrar a tela `/configuracoes`
  // real por completo (Perfis/Permissões, Simulador) e o card de
  // Métricas de Carteira do Dashboard.
  'role:manage',
  'simulation:use',
  'client:read:sensitive',
  'report:metrics:read',
  // Configuration Engine (Prompt 13) — OWNER de demonstração ganha as 4
  // permissões novas para o modo demo mostrar o grupo CONFIGURAÇÕES
  // completo (Geral, Campos Extras, Conjuntos de Valores, Categorias,
  // Grupos, Modelos, Feriados, Financeiro, IA).
  'configuration:read',
  'configuration:manage',
  'capture:read',
  'capture:create',
  'capture:update',
  'capture:delete',
  'capture:sync',
  'capture:manage',
  'publication:read',
  'publication:update',
  'publication:delete',
  'publication:manage',
  'movement:read',
  'movement:update',
  'movement:manage',
  'extrajudicial-movement:read',
  'request:read',
  'request:create',
  'request:update',
  'request:delete',
  'extrajudicial-movement:create',
  'extrajudicial-movement:update',
  'extrajudicial-movement:delete',
  'extrajudicial-movement:manage',
  'ai:manage',
  'financeiro:read',
  // Task Engine (Prompt 14) — OWNER de demonstração ganha as 7 permissões
  // novas para o modo demo mostrar o grupo TAREFAS completo (Minhas
  // Tarefas, Equipe, Kanban, Calendário).
  'task:create',
  'task:read:all',
  'task:read:team',
  'task:read:assigned',
  'task:update',
  'task:delete',
  'task:team:manage',
  'comment:create',
];

function problem(status: number, code: string, detail: string, fieldErrors?: unknown[]) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'demo-correlation-id',
      timestamp: new Date().toISOString(),
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status },
  );
}

// ---------------------------------------------------------------------
// Identity (demo)
// ---------------------------------------------------------------------
const identityDemoHandlers = [
  http.post(`${base}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    return HttpResponse.json(
      {
        usuario: {
          id: 'demo-user-novo',
          nome: 'Nova',
          email: body.email ?? 'nova@quilombodev.com',
        },
        escritorio: {
          id: 'demo-office-novo',
          slug: 'novo-escritorio',
          nomeFantasia: 'Novo Escritório',
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${base}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; senha?: string };
    if (body.senha === 'senha-errada-123') {
      return problem(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
    }
    return HttpResponse.json({
      usuario: { id: DEMO_USER.id, nome: DEMO_USER.nome, email: body.email ?? DEMO_USER.email },
      escritorios: [{ id: DEMO_OFFICE.id, nome: DEMO_OFFICE.nome, papel: 'OWNER' }],
      escritorioAtivoId: DEMO_OFFICE.id,
    });
  }),

  http.get(`${base}/me`, () =>
    HttpResponse.json({
      usuario: DEMO_USER,
      membro: { id: DEMO_MEMBRO_ID, papel: 'OWNER', permissions: DEMO_PERMISSIONS },
      escritorio: DEMO_OFFICE,
    }),
  ),

  http.post(`${base}/auth/switch-office`, () => HttpResponse.json({ ok: true })),
  http.post(`${base}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/auth/password-recovery`, () =>
    HttpResponse.json({ ok: true }, { status: 202 }),
  ),
  http.post(`${base}/auth/password-reset`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/me/password`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${base}/auth/sessions`, () =>
    HttpResponse.json([
      {
        id: 'demo-session-atual',
        dispositivo: 'Chrome · Windows',
        ip: '203.0.113.10',
        ultimoUsoEm: new Date().toISOString(),
        criadaEm: '2026-07-01T09:00:00.000Z',
        atual: true,
      },
      {
        id: 'demo-session-outra',
        dispositivo: 'Safari · iPhone',
        ip: '203.0.113.42',
        ultimoUsoEm: '2026-07-28T18:00:00.000Z',
        criadaEm: '2026-06-15T09:00:00.000Z',
        atual: false,
      },
    ]),
  ),
  http.delete(`${base}/auth/sessions/:id`, () => new HttpResponse(null, { status: 204 })),
];

// ---------------------------------------------------------------------
// Team (demo)
// ---------------------------------------------------------------------
// `let` (Permission Engine, Prompt 12) — o Simulador/tela de Perfis do
// modo demo cria perfis customizados de verdade, dentro da própria sessão
// do navegador (nunca persiste entre recargas, mesmo racional de todo o
// resto deste arquivo).
interface DemoRole {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  ehSistema: boolean;
}

let demoRoles: DemoRole[] = [
  { id: 'demo-role-owner', nome: 'OWNER', descricao: 'Acesso total', nivel: 100, ehSistema: true },
  { id: 'demo-role-advogado', nome: 'ADVOGADO', descricao: 'Advogado', nivel: 50, ehSistema: true },
  {
    id: 'demo-role-assistente',
    nome: 'ASSISTENTE',
    descricao: 'Assistente',
    nivel: 10,
    ehSistema: true,
  },
];

const DEMO_PERMISSION_CATALOG = [
  {
    id: 'demo-perm-office-read',
    chave: 'office:read',
    recurso: 'office',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Escritório',
    descricao: 'Visualizar dados do escritório',
  },
  {
    id: 'demo-perm-member-read',
    chave: 'member:read',
    recurso: 'member',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Membros',
    descricao: 'Listar membros',
  },
  {
    id: 'demo-perm-client-read',
    chave: 'client:read',
    recurso: 'client',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Visualizar clientes',
  },
  {
    id: 'demo-perm-client-read-sensitive',
    chave: 'client:read:sensitive',
    recurso: 'client',
    acao: 'read:sensitive',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Ver CPF/CNPJ e endereço completos',
  },
  {
    id: 'demo-perm-client-export',
    chave: 'client:export',
    recurso: 'client',
    acao: 'export',
    escopo: 'ALL',
    categoria: 'Clientes',
    descricao: 'Exportar lista de clientes (CSV)',
  },
  {
    id: 'demo-perm-case-read-all',
    chave: 'case:read:all',
    recurso: 'case',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Processos',
    descricao: 'Ver todos os processos',
  },
  {
    id: 'demo-perm-document-read-all',
    chave: 'document:read:all',
    recurso: 'document',
    acao: 'read',
    escopo: 'ALL',
    categoria: 'Documentos',
    descricao: 'Ver todos os documentos',
  },
  {
    id: 'demo-perm-ai-summarize',
    chave: 'ai:summarize',
    recurso: 'ai',
    acao: 'summarize',
    escopo: 'ALL',
    categoria: 'IA',
    descricao: 'Gerar resumo por IA',
  },
  {
    id: 'demo-perm-role-manage',
    chave: 'role:manage',
    recurso: 'role',
    acao: 'manage',
    escopo: 'ALL',
    categoria: 'Administração',
    descricao: 'Criar e editar perfis e permissões',
  },
  {
    id: 'demo-perm-simulation-use',
    chave: 'simulation:use',
    recurso: 'simulation',
    acao: 'use',
    escopo: 'ALL',
    categoria: 'Administração',
    descricao: 'Simular a navegação de outro membro',
  },
  {
    id: 'demo-perm-report-metrics',
    chave: 'report:metrics:read',
    recurso: 'report',
    acao: 'metrics:read',
    escopo: 'ALL',
    categoria: 'Relatórios',
    descricao: 'Ver indicadores do escritório',
  },
];

const demoRolePermissions: Record<string, string[]> = {
  'demo-role-owner': DEMO_PERMISSION_CATALOG.map((c) => c.chave),
  'demo-role-advogado': [
    'office:read',
    'member:read',
    'client:read',
    'case:read:all',
    'ai:summarize',
  ],
  'demo-role-assistente': ['office:read', 'client:read', 'document:read:all'],
};

/**
 * Catálogo de Cargos (Sprint "Colaboradores") — declarado antes de
 * `demoCollaborators` (abaixo) porque seus registros referenciam estes
 * mesmos IDs no campo `cargo`; precisa existir antes (`const`/`let` não
 * fazem hoisting de valor, só de binding) para o filtro por cargo da
 * listagem combinar com as opções do `Select`.
 */
const DEMO_CARGO_ADVOGADO_ID = 'demo-cargo-advogado';
const DEMO_CARGO_ADVOGADO_SENIOR_ID = 'demo-cargo-advogado-senior';
const DEMO_CARGO_ESTAGIARIO_ID = 'demo-cargo-estagiario';
const DEMO_CARGO_ANALISTA_ADM_ID = 'demo-cargo-analista-adm';

let demoCargos = [
  {
    id: DEMO_CARGO_ADVOGADO_ID,
    nome: 'Advogado',
    descricao: null as string | null,
    ordem: 0,
    ativo: true,
  },
  {
    id: DEMO_CARGO_ADVOGADO_SENIOR_ID,
    nome: 'Advogado Sênior',
    descricao: null as string | null,
    ordem: 1,
    ativo: true,
  },
  {
    id: DEMO_CARGO_ESTAGIARIO_ID,
    nome: 'Estagiário',
    descricao: null as string | null,
    ordem: 2,
    ativo: true,
  },
  {
    id: DEMO_CARGO_ANALISTA_ADM_ID,
    nome: 'Analista Administrativo',
    descricao: null as string | null,
    ordem: 3,
    ativo: true,
  },
];

const demoMembers = [
  {
    id: DEMO_MEMBRO_ID,
    usuario: { nome: 'João Silva', email: 'demo@quilombodev.com', avatarUrl: null },
    papel: 'OWNER',
    status: 'ATIVO' as const,
    entrouEm: '2025-03-10T12:00:00.000Z',
  },
  {
    id: 'demo-member-maria',
    usuario: {
      nome: 'Maria Oliveira',
      email: 'maria.oliveira@silvaassociados.com.br',
      avatarUrl: null,
    },
    papel: 'ADVOGADO',
    status: 'ATIVO' as const,
    entrouEm: '2025-05-22T12:00:00.000Z',
  },
  {
    id: 'demo-member-pedro',
    usuario: { nome: 'Pedro Costa', email: 'pedro.costa@silvaassociados.com.br', avatarUrl: null },
    papel: 'ASSISTENTE',
    status: 'ATIVO' as const,
    entrouEm: '2025-09-04T12:00:00.000Z',
  },
  {
    id: 'demo-member-ana',
    usuario: { nome: 'Ana Santos', email: 'ana.santos@silvaassociados.com.br', avatarUrl: null },
    papel: 'ADVOGADO',
    status: 'INATIVO' as const,
    entrouEm: '2024-11-18T12:00:00.000Z',
  },
];

const demoInvitations = [
  {
    id: 'demo-invite-1',
    email: 'carla.nova@exemplo.com',
    status: 'PENDENTE' as const,
    expiraEm: '2026-08-15T00:00:00.000Z',
    criadoEm: '2026-07-25T00:00:00.000Z',
    papelId: 'demo-role-advogado',
  },
];

// ---------------------------------------------------------------------
// Colaboradores (Sprint "Colaboradores") — dataset próprio do modo demo,
// cobrindo as 5 situações de acesso possíveis (`SituacaoAcesso`). Reaproveita
// os mesmos IDs de `demoMembers` para João/Maria/Pedro/Ana (referenciados
// em `demoClients`/`demoLegalCases`/`demoCaseTeam` como responsável) e
// acrescenta 3 colaboradores só desta listagem (Carla — convite pendente,
// espelha `demo-invite-1` acima —, Rafael e Beatriz — cadastro de RH sem
// acesso ao sistema).
// ---------------------------------------------------------------------
interface DemoCollaboratorAddress {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
}

interface DemoCollaborator {
  id: string;
  nome: string;
  nomeSocial: string | null;
  fotoUrl: string | null;
  cpf: string | null;
  email: string;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  dataNascimento: string | null;
  cargo: { id: string; nome: string } | null;
  grupos: { id: string; nome: string }[];
  papel: { id: string; nome: string } | null;
  temAcesso: boolean;
  situacaoAcesso: string;
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  criadoEm: string;
  atualizadoEm: string;
  rg: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  anotacoes: string | null;
  endereco: DemoCollaboratorAddress;
  departamento: string | null;
  numeroOab: string | null;
  ufOab: string | null;
  situacaoOab: string | null;
  observacaoOab: string | null;
  dataEntrada: string | null;
  responsavel: { id: string; nome: string } | null;
  entrouEm: string | null;
}

const DEMO_EMPTY_ADDRESS: DemoCollaboratorAddress = {
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  pais: null,
};

let demoCollaborators: DemoCollaborator[] = [
  {
    id: DEMO_MEMBRO_ID,
    nome: 'João Silva',
    nomeSocial: null,
    fotoUrl: null,
    cpf: '52998224725',
    email: 'demo@quilombodev.com',
    telefone: null,
    celular: '11988887001',
    whatsapp: '11988887001',
    dataNascimento: '1982-05-14',
    cargo: { id: DEMO_CARGO_ADVOGADO_SENIOR_ID, nome: 'Advogado Sênior' },
    grupos: [{ id: 'demo-grupo-1', nome: 'Equipe Cível' }],
    papel: { id: 'demo-role-owner', nome: 'OWNER' },
    temAcesso: true,
    situacaoAcesso: 'DESBLOQUEADO',
    status: 'ATIVO',
    criadoEm: '2025-03-10T12:00:00.000Z',
    atualizadoEm: '2025-03-10T12:00:00.000Z',
    rg: '345678901',
    estadoCivil: 'CASADO',
    profissao: 'Advogado',
    nomeMae: 'Regina Silva',
    nomePai: 'Antônio Silva',
    anotacoes: 'Sócio-fundador do escritório.',
    endereco: { ...DEMO_EMPTY_ADDRESS, cidade: 'São Paulo', uf: 'SP', pais: 'Brasil' },
    departamento: 'Diretoria',
    numeroOab: '111222',
    ufOab: 'SP',
    situacaoOab: 'REGULAR',
    observacaoOab: null,
    dataEntrada: '2025-03-10',
    responsavel: null,
    entrouEm: '2025-03-10T12:00:00.000Z',
  },
  {
    id: 'demo-member-maria',
    nome: 'Maria Oliveira',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'maria.oliveira@silvaassociados.com.br',
    telefone: null,
    celular: '11988887002',
    whatsapp: null,
    dataNascimento: '1990-09-02',
    cargo: { id: DEMO_CARGO_ADVOGADO_ID, nome: 'Advogado' },
    grupos: [{ id: 'demo-grupo-1', nome: 'Equipe Cível' }],
    papel: { id: 'demo-role-advogado', nome: 'ADVOGADO' },
    temAcesso: true,
    situacaoAcesso: 'DESBLOQUEADO',
    status: 'ATIVO',
    criadoEm: '2025-05-22T12:00:00.000Z',
    atualizadoEm: '2025-05-22T12:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: 'Advogada',
    nomeMae: null,
    nomePai: null,
    anotacoes: null,
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: null,
    numeroOab: '222333',
    ufOab: 'SP',
    situacaoOab: 'REGULAR',
    observacaoOab: null,
    dataEntrada: '2025-05-22',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: '2025-05-22T12:00:00.000Z',
  },
  {
    id: 'demo-member-pedro',
    nome: 'Pedro Costa',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'pedro.costa@silvaassociados.com.br',
    telefone: null,
    celular: '11988887003',
    whatsapp: null,
    dataNascimento: '1995-12-20',
    cargo: { id: DEMO_CARGO_ANALISTA_ADM_ID, nome: 'Analista Administrativo' },
    grupos: [],
    papel: { id: 'demo-role-assistente', nome: 'ASSISTENTE' },
    temAcesso: true,
    situacaoAcesso: 'BLOQUEADO',
    status: 'ATIVO',
    criadoEm: '2025-09-04T12:00:00.000Z',
    atualizadoEm: '2026-07-15T09:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: null,
    nomeMae: null,
    nomePai: null,
    anotacoes:
      'Bloqueado após tentativas de acesso fora do horário comercial — aguardando confirmação por telefone.',
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: 'Administrativo',
    numeroOab: null,
    ufOab: null,
    situacaoOab: null,
    observacaoOab: null,
    dataEntrada: '2025-09-04',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: '2025-09-04T12:00:00.000Z',
  },
  {
    id: 'demo-member-ana',
    nome: 'Ana Santos',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'ana.santos@silvaassociados.com.br',
    telefone: null,
    celular: null,
    whatsapp: null,
    dataNascimento: '1988-03-11',
    cargo: { id: DEMO_CARGO_ADVOGADO_ID, nome: 'Advogado' },
    grupos: [],
    papel: { id: 'demo-role-advogado', nome: 'ADVOGADO' },
    temAcesso: true,
    situacaoAcesso: 'SUSPENSO',
    status: 'ATIVO',
    criadoEm: '2024-11-18T12:00:00.000Z',
    atualizadoEm: '2026-06-01T09:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: 'Advogada',
    nomeMae: null,
    nomePai: null,
    anotacoes: 'Suspensa durante licença — retorno previsto.',
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: null,
    numeroOab: '333444',
    ufOab: 'RJ',
    situacaoOab: 'REGULAR',
    observacaoOab: null,
    dataEntrada: '2024-11-18',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: '2024-11-18T12:00:00.000Z',
  },
  {
    id: 'demo-collab-carla',
    nome: 'Carla Nova',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'carla.nova@exemplo.com',
    telefone: null,
    celular: null,
    whatsapp: null,
    dataNascimento: '2000-02-18',
    cargo: { id: DEMO_CARGO_ESTAGIARIO_ID, nome: 'Estagiário' },
    grupos: [],
    papel: { id: 'demo-role-advogado', nome: 'ADVOGADO' },
    temAcesso: true,
    situacaoAcesso: 'CONVITE_PENDENTE',
    status: 'ATIVO',
    criadoEm: '2026-07-25T00:00:00.000Z',
    atualizadoEm: '2026-07-25T00:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: null,
    nomeMae: null,
    nomePai: null,
    anotacoes: null,
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: null,
    numeroOab: null,
    ufOab: null,
    situacaoOab: null,
    observacaoOab: null,
    dataEntrada: '2026-07-25',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: null,
  },
  {
    id: 'demo-collab-rafael',
    nome: 'Rafael Souza',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'rafael.souza@silvaassociados.com.br',
    telefone: null,
    celular: '11988887006',
    whatsapp: null,
    dataNascimento: '2003-10-08',
    cargo: { id: DEMO_CARGO_ESTAGIARIO_ID, nome: 'Estagiário' },
    grupos: [],
    papel: null,
    temAcesso: false,
    situacaoAcesso: 'SEM_ACESSO',
    status: 'ATIVO',
    criadoEm: '2026-06-10T09:00:00.000Z',
    atualizadoEm: '2026-06-10T09:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: null,
    nomeMae: null,
    nomePai: null,
    anotacoes: 'Cadastro de RH — sem conta no sistema ainda.',
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: 'Jurídico',
    numeroOab: null,
    ufOab: null,
    situacaoOab: null,
    observacaoOab: null,
    dataEntrada: '2026-06-10',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: null,
  },
  {
    id: 'demo-collab-beatriz',
    nome: 'Beatriz Fernandes',
    nomeSocial: null,
    fotoUrl: null,
    cpf: null,
    email: 'beatriz.fernandes@silvaassociados.com.br',
    telefone: null,
    celular: null,
    whatsapp: null,
    dataNascimento: '1993-07-25',
    cargo: { id: DEMO_CARGO_ADVOGADO_ID, nome: 'Advogado' },
    grupos: [{ id: 'demo-grupo-1', nome: 'Equipe Cível' }],
    papel: null,
    temAcesso: false,
    situacaoAcesso: 'SEM_ACESSO',
    status: 'ATIVO',
    criadoEm: '2026-04-02T09:00:00.000Z',
    atualizadoEm: '2026-04-02T09:00:00.000Z',
    rg: null,
    estadoCivil: null,
    profissao: 'Advogada',
    nomeMae: null,
    nomePai: null,
    anotacoes:
      'Colaboradora externa — atua só em consultoria pontual, sem necessidade de acesso ao sistema.',
    endereco: DEMO_EMPTY_ADDRESS,
    departamento: null,
    numeroOab: '444555',
    ufOab: 'SP',
    situacaoOab: 'REGULAR',
    observacaoOab: null,
    dataEntrada: '2026-04-02',
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    entrouEm: null,
  },
];

let nextDemoCollaboratorId = 1;

function toDemoListItem(c: DemoCollaborator) {
  return {
    id: c.id,
    nome: c.nome,
    nomeSocial: c.nomeSocial,
    fotoUrl: c.fotoUrl,
    cpf: c.cpf,
    email: c.email,
    telefone: c.telefone,
    celular: c.celular,
    dataNascimento: c.dataNascimento,
    cargo: c.cargo,
    grupos: c.grupos,
    papel: c.papel,
    temAcesso: c.temAcesso,
    situacaoAcesso: c.situacaoAcesso,
    status: c.status,
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
  };
}

const DEMO_SITUACAO_FILTER_MAP: Record<string, string> = {
  desbloqueado: 'DESBLOQUEADO',
  bloqueado: 'BLOQUEADO',
  suspenso: 'SUSPENSO',
  convite_pendente: 'CONVITE_PENDENTE',
  inativo: 'INATIVO',
};

function filterDemoCollaborators(url: URL): DemoCollaborator[] {
  const q = url.searchParams.get('q')?.toLowerCase();
  const nome = url.searchParams.get('nome')?.toLowerCase();
  const cpf = url.searchParams.get('cpf');
  const email = url.searchParams.get('email')?.toLowerCase();
  const telefone = url.searchParams.get('telefone');
  const grupoId = url.searchParams.get('grupoId');
  const cargoId = url.searchParams.get('cargoId');
  const acesso = url.searchParams.get('acesso');
  const situacao = url.searchParams.get('situacao');
  const nascimentoDia = url.searchParams.get('nascimentoDia');
  const nascimentoMes = url.searchParams.get('nascimentoMes');
  const nascimentoAno = url.searchParams.get('nascimentoAno');
  const nascimentoDe = url.searchParams.get('nascimentoDe');
  const nascimentoAte = url.searchParams.get('nascimentoAte');
  const cadastroDe = url.searchParams.get('cadastroDe');
  const cadastroAte = url.searchParams.get('cadastroAte');
  const alteracaoDe = url.searchParams.get('alteracaoDe');
  const alteracaoAte = url.searchParams.get('alteracaoAte');

  return demoCollaborators.filter((c) => {
    if (
      q &&
      !(
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.cpf ?? '').includes(q)
      )
    ) {
      return false;
    }
    if (nome && !c.nome.toLowerCase().includes(nome)) return false;
    if (cpf && !(c.cpf ?? '').includes(cpf)) return false;
    if (email && !c.email.toLowerCase().includes(email)) return false;
    if (telefone && !(c.telefone ?? '').includes(telefone) && !(c.celular ?? '').includes(telefone))
      return false;
    if (grupoId && !c.grupos.some((g) => g.id === grupoId)) return false;
    if (cargoId && c.cargo?.id !== cargoId) return false;
    if (acesso === 'com_acesso' && !c.temAcesso) return false;
    if (acesso === 'sem_acesso' && c.temAcesso) return false;
    if (situacao && situacao !== 'todos' && c.situacaoAcesso !== DEMO_SITUACAO_FILTER_MAP[situacao])
      return false;
    if (c.dataNascimento) {
      const [ano, mes, dia] = c.dataNascimento.split('-');
      if (nascimentoDia && dia !== nascimentoDia.padStart(2, '0')) return false;
      if (nascimentoMes && mes !== nascimentoMes.padStart(2, '0')) return false;
      if (nascimentoAno && ano !== nascimentoAno) return false;
      if (nascimentoDe && c.dataNascimento < nascimentoDe) return false;
      if (nascimentoAte && c.dataNascimento > nascimentoAte) return false;
    } else if (nascimentoDia || nascimentoMes || nascimentoAno || nascimentoDe || nascimentoAte) {
      return false;
    }
    if (cadastroDe && c.criadoEm.slice(0, 10) < cadastroDe) return false;
    if (cadastroAte && c.criadoEm.slice(0, 10) > cadastroAte) return false;
    if (alteracaoDe && c.atualizadoEm.slice(0, 10) < alteracaoDe) return false;
    if (alteracaoAte && c.atualizadoEm.slice(0, 10) > alteracaoAte) return false;
    return true;
  });
}

function sortDemoCollaborators(items: DemoCollaborator[], sort: string | null): DemoCollaborator[] {
  const sorted = [...items];
  const cmp = {
    nome_asc: (a: DemoCollaborator, b: DemoCollaborator) => a.nome.localeCompare(b.nome),
    nome_desc: (a: DemoCollaborator, b: DemoCollaborator) => b.nome.localeCompare(a.nome),
    cargo_asc: (a: DemoCollaborator, b: DemoCollaborator) =>
      (a.cargo?.nome ?? '').localeCompare(b.cargo?.nome ?? ''),
    cargo_desc: (a: DemoCollaborator, b: DemoCollaborator) =>
      (b.cargo?.nome ?? '').localeCompare(a.cargo?.nome ?? ''),
    nascimento_asc: (a: DemoCollaborator, b: DemoCollaborator) =>
      (a.dataNascimento ?? '').localeCompare(b.dataNascimento ?? ''),
    nascimento_desc: (a: DemoCollaborator, b: DemoCollaborator) =>
      (b.dataNascimento ?? '').localeCompare(a.dataNascimento ?? ''),
    cadastro_asc: (a: DemoCollaborator, b: DemoCollaborator) =>
      a.criadoEm.localeCompare(b.criadoEm),
    cadastro_desc: (a: DemoCollaborator, b: DemoCollaborator) =>
      b.criadoEm.localeCompare(a.criadoEm),
    alteracao_asc: (a: DemoCollaborator, b: DemoCollaborator) =>
      a.atualizadoEm.localeCompare(b.atualizadoEm),
    alteracao_desc: (a: DemoCollaborator, b: DemoCollaborator) =>
      b.atualizadoEm.localeCompare(a.atualizadoEm),
  }[sort ?? 'nome_asc'];
  return cmp ? sorted.sort(cmp) : sorted;
}

const DEMO_COLLABORATOR_QUERY_MARKERS = [
  'sort',
  'situacao',
  'acesso',
  'cursor',
  'limit',
  'grupoId',
  'cargoId',
];

const teamDemoHandlers = [
  http.get(`${base}/members`, ({ request }) => {
    const url = new URL(request.url);
    const isCollaboratorsQuery = DEMO_COLLABORATOR_QUERY_MARKERS.some((key) =>
      url.searchParams.has(key),
    );
    if (!isCollaboratorsQuery) return HttpResponse.json(demoMembers);

    const filtered = filterDemoCollaborators(url);
    const sorted = sortDemoCollaborators(filtered, url.searchParams.get('sort'));
    const limit = Number(url.searchParams.get('limit') ?? 20) || 20;
    const cursor = url.searchParams.get('cursor');
    const startIndex = cursor ? sorted.findIndex((c) => c.id === cursor) + 1 : 0;
    const page = sorted.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < sorted.length ? (page[page.length - 1]?.id ?? null) : null;

    return HttpResponse.json({ items: page.map(toDemoListItem), nextCursor, total: sorted.length });
  }),

  http.get(`${base}/members/:id`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    return HttpResponse.json(collaborator);
  }),

  http.post(`${base}/members`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown> & {
      nome: string;
      email: string;
      comAcesso: boolean;
      papelId?: string;
      cargoId?: string;
      endereco?: Partial<DemoCollaboratorAddress>;
    };
    const id = `demo-collab-mock-${nextDemoCollaboratorId++}`;
    const cargo = demoCargos.find((c) => c.id === body.cargoId) ?? null;
    const papel = body.comAcesso ? (demoRoles.find((r) => r.id === body.papelId) ?? null) : null;
    const now = new Date().toISOString();
    const created: DemoCollaborator = {
      id,
      nome: body.nome,
      nomeSocial: (body.nomeSocial as string) || null,
      fotoUrl: (body.fotoUrl as string) || null,
      cpf: (body.cpf as string) || null,
      email: body.email,
      telefone: (body.telefone as string) || null,
      celular: (body.celular as string) || null,
      whatsapp: (body.whatsapp as string) || null,
      dataNascimento: (body.dataNascimento as string) || null,
      cargo: cargo ? { id: cargo.id, nome: cargo.nome } : null,
      grupos: [],
      papel: papel ? { id: papel.id, nome: papel.nome } : null,
      temAcesso: !!body.comAcesso,
      situacaoAcesso: body.comAcesso ? 'CONVITE_PENDENTE' : 'SEM_ACESSO',
      status: 'ATIVO',
      criadoEm: now,
      atualizadoEm: now,
      rg: (body.rg as string) || null,
      estadoCivil: (body.estadoCivil as string) || null,
      profissao: (body.profissao as string) || null,
      nomeMae: (body.nomeMae as string) || null,
      nomePai: (body.nomePai as string) || null,
      anotacoes: (body.anotacoes as string) || null,
      endereco: { ...DEMO_EMPTY_ADDRESS, ...(body.endereco ?? {}) },
      departamento: (body.departamento as string) || null,
      numeroOab: (body.numeroOab as string) || null,
      ufOab: (body.ufOab as string) || null,
      situacaoOab: (body.situacaoOab as string) || null,
      observacaoOab: (body.observacaoOab as string) || null,
      dataEntrada: (body.dataEntrada as string) || null,
      responsavel: resolveResponsavel(body.responsavelId) ?? null,
      entrouEm: null,
    };
    demoCollaborators = [created, ...demoCollaborators];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/members/:id`, async ({ params, request }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    const body = (await request.json()) as Record<string, unknown>;
    const { grupoIds: _grupoIds, endereco, cargoId, responsavelId, ...rest } = body;
    void _grupoIds;
    Object.assign(collaborator, rest);
    if (endereco) collaborator.endereco = { ...collaborator.endereco, ...(endereco as object) };
    if (cargoId !== undefined) {
      const cargo = demoCargos.find((c) => c.id === cargoId);
      collaborator.cargo = cargo ? { id: cargo.id, nome: cargo.nome } : null;
    }
    if (responsavelId !== undefined)
      collaborator.responsavel = resolveResponsavel(responsavelId) ?? null;
    collaborator.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/block`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (collaborator) collaborator.situacaoAcesso = 'BLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/members/:id/unblock`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (collaborator) collaborator.situacaoAcesso = 'DESBLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/members/:id/suspend`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (collaborator) collaborator.situacaoAcesso = 'SUSPENSO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/members/:id/unsuspend`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (collaborator) collaborator.situacaoAcesso = 'DESBLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/members/:id/grant-access`, async ({ params, request }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    const body = (await request.json()) as { email?: string; papelId: string };
    const role = demoRoles.find((r) => r.id === body.papelId);
    if (body.email) collaborator.email = body.email;
    collaborator.papel = role ? { id: role.id, nome: role.nome } : collaborator.papel;
    collaborator.temAcesso = true;
    collaborator.situacaoAcesso = 'CONVITE_PENDENTE';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/members/:id/revoke-access`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.temAcesso = false;
    collaborator.situacaoAcesso = 'SEM_ACESSO';
    collaborator.papel = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/members/:id/sessions`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/members/:id/role`, () => new HttpResponse(null, { status: 204 })),
  http.delete(`${base}/members/:id`, ({ params }) => {
    const collaborator = demoCollaborators.find((c) => c.id === params.id);
    if (collaborator) collaborator.status = 'INATIVO';
    return HttpResponse.json({ desativado: true });
  }),
  http.post(`${base}/invitations`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; papelId?: string };
    return HttpResponse.json(
      {
        id: 'demo-invite-novo',
        email: body.email,
        status: 'PENDENTE',
        expiraEm: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
  http.get(`${base}/invitations`, () => HttpResponse.json(demoInvitations)),
  http.post(`${base}/invitations/:id/resend`, () => new HttpResponse(null, { status: 204 })),
  http.delete(`${base}/invitations/:id`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${base}/roles`, () => HttpResponse.json(demoRoles)),
];

// ---------------------------------------------------------------------
// Permissions (demo) — Permission Engine, Prompt 12. `GET /roles`
// continua em `teamDemoHandlers` (não duplicado).
// ---------------------------------------------------------------------
const permissionsDemoHandlers = [
  http.get(`${base}/permissions`, () => HttpResponse.json(DEMO_PERMISSION_CATALOG)),

  http.get(`${base}/roles/:id`, ({ params }) => {
    const role = demoRoles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    return HttpResponse.json({ ...role, permissoes: demoRolePermissions[role.id] ?? [] });
  }),

  http.post(`${base}/roles`, async ({ request }) => {
    const body = (await request.json()) as {
      nome: string;
      descricao?: string;
      permissoes: string[];
    };
    const id = `demo-role-custom-${demoRoles.length + 1}`;
    demoRoles = [
      ...demoRoles,
      { id, nome: body.nome, descricao: body.descricao ?? null, nivel: 30, ehSistema: false },
    ];
    demoRolePermissions[id] = body.permissoes;
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/roles/:id`, async ({ params, request }) => {
    const role = demoRoles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema)
      return problem(403, 'FORBIDDEN', 'Perfis de sistema não podem ser renomeados.');
    const body = (await request.json()) as { nome?: string; descricao?: string };
    demoRoles = demoRoles.map((r) => (r.id === role.id ? { ...r, ...body } : r));
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/roles/:id/permissions`, async ({ params, request }) => {
    const role = demoRoles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema) return problem(403, 'FORBIDDEN', 'Perfis de sistema têm permissões fixas.');
    const body = (await request.json()) as { permissoes: string[] };
    demoRolePermissions[role.id] = body.permissoes;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/roles/:id`, ({ params }) => {
    const role = demoRoles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema)
      return problem(403, 'FORBIDDEN', 'Perfis de sistema não podem ser excluídos.');
    demoRoles = demoRoles.filter((r) => r.id !== role.id);
    delete demoRolePermissions[role.id];
    return new HttpResponse(null, { status: 204 });
  }),
];

// ---------------------------------------------------------------------
// Clients (demo) — módulo real desde o Prompt 7; estes handlers
// interceptam os MESMOS paths que o backend real usaria (`/clients`),
// necessário porque este ambiente de demonstração não tem Postgres
// disponível (ver docs/backend-implementation/00-status.md).
// ---------------------------------------------------------------------
interface DemoClient {
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
  ultimaMovimentacaoEm: string;
  nomeMae: string | null;
  nomePai: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  dataNascimento: string | null;
  camposExtrasValores: Record<string, string>;
  criadoEm: string;
}

/** Resolve `responsavelId` (enviado pelo formulário) em `{id, nome}` a partir de `demoMembers` — mesma fonte que `useMembers()` usa no formulário. */
function resolveResponsavel(responsavelId: unknown): { id: string; nome: string } | undefined {
  if (typeof responsavelId !== 'string' || !responsavelId) return undefined;
  const membro = demoMembers.find((m) => m.id === responsavelId);
  return membro ? { id: membro.id, nome: membro.usuario.nome } : undefined;
}

const demoClientFavoritos = new Set<string>(['demo-client-roberto']);

let demoClients: DemoClient[] = [
  {
    id: 'demo-client-roberto',
    nome: 'Roberto Almeida',
    nomeSocial: null,
    razaoSocial: null,
    tipo: 'PESSOA_FISICA',
    categoriaRelacionamento: 'CLIENTE',
    avatarUrl: null,
    documento: '52998224725',
    emails: ['roberto.almeida@example.com'],
    telefones: ['11987650001', '11987650002'],
    enderecoLogradouro: 'Avenida Paulista',
    enderecoNumero: '1000',
    enderecoComplemento: 'Sala 12',
    enderecoBairro: 'Bela Vista',
    enderecoCidade: 'São Paulo',
    enderecoUf: 'SP',
    enderecoCep: '01310100',
    observacoes: 'Indicado por outro cliente do escritório.',
    status: 'ATIVO',
    processosAtivos: 2,
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    ultimaMovimentacaoEm: new Date().toISOString(),
    nomeMae: 'Maria Almeida',
    nomePai: 'José Almeida',
    estadoCivil: 'CASADO',
    profissao: 'Empresário',
    dataNascimento: '1980-04-12',
    camposExtrasValores: {},
    criadoEm: '2025-03-10T12:00:00.000Z',
  },
  {
    id: 'demo-client-fernanda',
    nome: 'Fernanda Lima',
    nomeSocial: null,
    razaoSocial: null,
    tipo: 'PESSOA_FISICA',
    categoriaRelacionamento: 'CLIENTE',
    avatarUrl: null,
    documento: null,
    emails: ['fernanda.lima@example.com'],
    telefones: [],
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
    responsavel: { id: 'demo-member-maria', nome: 'Maria Oliveira' },
    ultimaMovimentacaoEm: '2026-07-28T09:00:00.000Z',
    nomeMae: null,
    nomePai: null,
    estadoCivil: null,
    profissao: null,
    dataNascimento: null,
    camposExtrasValores: {},
    criadoEm: '2025-05-02T12:00:00.000Z',
  },
  {
    id: 'demo-client-horizonte',
    nome: 'Construtora Horizonte Ltda.',
    nomeSocial: null,
    razaoSocial: 'Construtora Horizonte Ltda.',
    tipo: 'PESSOA_JURIDICA',
    categoriaRelacionamento: 'CLIENTE',
    avatarUrl: null,
    documento: '11222333000181',
    emails: ['contato@horizonte.com.br'],
    telefones: ['1132220000'],
    enderecoLogradouro: 'Rua Augusta',
    enderecoNumero: '500',
    enderecoComplemento: null,
    enderecoBairro: 'Consolação',
    enderecoCidade: 'São Paulo',
    enderecoUf: 'SP',
    enderecoCep: '01305000',
    observacoes: null,
    status: 'ATIVO',
    processosAtivos: 1,
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
    ultimaMovimentacaoEm: '2026-07-20T09:00:00.000Z',
    nomeMae: null,
    nomePai: null,
    estadoCivil: null,
    profissao: null,
    dataNascimento: null,
    camposExtrasValores: {},
    criadoEm: '2025-02-18T12:00:00.000Z',
  },
  {
    id: 'demo-client-prospect',
    nome: 'Camila Rodrigues',
    nomeSocial: null,
    razaoSocial: null,
    tipo: 'PESSOA_FISICA',
    categoriaRelacionamento: 'CONTATO',
    avatarUrl: null,
    documento: null,
    emails: [],
    telefones: ['21999998888'],
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
    ultimaMovimentacaoEm: '2026-07-15T09:00:00.000Z',
    nomeMae: null,
    nomePai: null,
    estadoCivil: 'SOLTEIRO',
    profissao: 'Designer',
    dataNascimento: '1995-09-30',
    camposExtrasValores: {},
    criadoEm: '2026-06-01T12:00:00.000Z',
  },
];

const clientsDemoHandlers = [
  http.get(`${base}/clients`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const items = q ? demoClients.filter((c) => c.nome.toLowerCase().includes(q)) : demoClients;
    return HttpResponse.json({
      items: items.map((c) => ({ ...c, favorito: demoClientFavoritos.has(c.id) })),
      nextCursor: null,
    });
  }),
  // Registrada antes de `GET /clients/:id` — senão MSW casaria "export" com `:id`.
  http.get(`${base}/clients/export`, () => {
    return HttpResponse.json({
      items: demoClients.map((c) => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        categoriaRelacionamento: c.categoriaRelacionamento,
        documento: c.documento,
        email: c.emails[0] ?? '',
        telefone: c.telefones[0] ?? '',
        celular: c.telefones[1] ?? '',
        status: c.status,
        criadoEm: c.criadoEm,
        atualizadoEm: c.ultimaMovimentacaoEm,
      })),
      truncado: false,
      limite: 5000,
    });
  }),
  http.post(`${base}/clients`, async ({ request }) => {
    const body = (await request.json()) as Partial<DemoClient> & { responsavelId?: string };
    const created: DemoClient = {
      id: `demo-client-${demoClients.length + 1}`,
      nome: body.nome ?? 'Novo Cliente',
      nomeSocial: body.nomeSocial ?? null,
      razaoSocial: body.razaoSocial ?? null,
      tipo: body.tipo ?? 'PESSOA_FISICA',
      categoriaRelacionamento: body.categoriaRelacionamento ?? 'CLIENTE',
      avatarUrl: body.avatarUrl ?? null,
      documento: null,
      emails: body.emails ?? [],
      telefones: body.telefones ?? [],
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
      ultimaMovimentacaoEm: new Date().toISOString(),
      nomeMae: body.nomeMae ?? null,
      nomePai: body.nomePai ?? null,
      estadoCivil: body.estadoCivil ?? null,
      profissao: body.profissao ?? null,
      dataNascimento: body.dataNascimento ?? null,
      camposExtrasValores: body.camposExtrasValores ?? {},
      criadoEm: new Date().toISOString(),
    };
    demoClients = [created, ...demoClients];
    return HttpResponse.json({ cliente: { id: created.id }, avisos: [] }, { status: 201 });
  }),
  http.get(`${base}/clients/:id`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    return HttpResponse.json({
      ...client,
      cpf: client.tipo === 'PESSOA_FISICA' ? client.documento : null,
      cnpj: client.tipo === 'PESSOA_JURIDICA' ? client.documento : null,
      atualizadoEm: client.ultimaMovimentacaoEm,
      documentosCount: 0,
      favorito: demoClientFavoritos.has(client.id),
    });
  }),
  http.get(`${base}/clients/:id/timeline`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    if (client.processosAtivos === 0) return HttpResponse.json({ items: [], nextCursor: null });
    return HttpResponse.json({
      items: [
        {
          id: `${client.id}-evento-1`,
          tipo: 'CLIENTE_ATUALIZADO',
          titulo: `Dados do cliente ${client.nome} foram atualizados`,
          descricao: null,
          dataEvento: client.ultimaMovimentacaoEm,
          origem: 'SISTEMA',
          autor: client.responsavel,
          entidadeRelacionada: { tipo: 'cliente', id: client.id },
          fixado: false,
          editavel: false,
        },
      ],
      nextCursor: null,
    });
  }),
  http.post(`${base}/clients/:id/favorite`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const favorito = !demoClientFavoritos.has(client.id);
    if (favorito) demoClientFavoritos.add(client.id);
    else demoClientFavoritos.delete(client.id);
    return HttpResponse.json({ favorito });
  }),
  http.patch(`${base}/clients/:id`, async ({ params, request }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const body = (await request.json()) as Partial<DemoClient> & { responsavelId?: string };
    const { responsavelId, ...rest } = body;
    Object.assign(client, rest);
    if (responsavelId !== undefined) client.responsavel = resolveResponsavel(responsavelId) ?? null;
    return HttpResponse.json({ avisos: [] });
  }),
  http.delete(`${base}/clients/:id`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    if (client.processosAtivos > 0) {
      return problem(409, 'HAS_ACTIVE_LEGAL_CASES', 'Este cliente possui processos vinculados.');
    }
    demoClients = demoClients.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/clients/:id/archive`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (client) client.status = 'INATIVO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/clients/:id/restore`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (client) client.status = 'ATIVO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/clients/:id/duplicate`, ({ params }) => {
    const client = demoClients.find((c) => c.id === params.id);
    if (!client) return problem(404, 'NOT_FOUND', 'Cliente não encontrado.');
    const copy = {
      ...client,
      id: `${client.id}-copia`,
      nome: `${client.nome} (cópia)`,
      status: 'PROSPECT' as const,
    };
    demoClients = [copy, ...demoClients];
    return HttpResponse.json({ id: copy.id }, { status: 201 });
  }),
  http.get(`${base}/clients/:id/legal-cases`, ({ params }) => {
    const cases = demoLegalCases.filter((c) => c.cliente.id === params.id);
    return HttpResponse.json(
      cases.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        numeroCnj: c.numeroCnj,
        status: c.status,
        prioridade: c.prioridade,
        proximaDataRelevante: c.proximaDataRelevante,
        versao: c.versao,
      })),
    );
  }),
];

// ---------------------------------------------------------------------
// Legal Cases (demo) — módulo real desde o Prompt 7, mesma ressalva de
// Clients acima. "42 processos" (métrica agregada) continua ilustrado
// só no card de Métricas de Carteira — aqui entram alguns processos
// realistas suficientes para navegar listagem/detalhe/equipe/prazos.
// ---------------------------------------------------------------------
interface DemoLegalCase {
  id: string;
  titulo: string;
  numeroCnj: string | null;
  status: string;
  prioridade: string;
  area: string;
  tribunal: string | null;
  comarca: string | null;
  segredoJustica: boolean;
  cliente: { id: string; nome: string };
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
  proximaDataRelevante: string | null;
  ultimaAtualizacaoEm: string;
  versao: number;
  tipo: 'JUDICIAL' | 'EXTRAJUDICIAL';
}

let demoLegalCases: DemoLegalCase[] = [
  {
    id: 'demo-case-1',
    titulo: 'Silva vs. Condomínio Aurora',
    numeroCnj: '00012345620268260100',
    status: 'ATIVO',
    prioridade: 'ALTA',
    area: 'Cível',
    tribunal: 'TJSP',
    comarca: 'São Paulo',
    segredoJustica: false,
    cliente: { id: 'demo-client-roberto', nome: 'Roberto Almeida' },
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null },
    proximaDataRelevante: new Date().toISOString(),
    ultimaAtualizacaoEm: new Date().toISOString(),
    versao: 3,
    tipo: 'JUDICIAL',
  },
  {
    id: 'demo-case-2',
    titulo: 'Oliveira — Rescisão Trabalhista',
    numeroCnj: null,
    status: 'ATIVO',
    prioridade: 'MEDIA',
    area: 'Trabalhista',
    tribunal: 'TRT-2',
    comarca: 'São Paulo',
    segredoJustica: false,
    cliente: { id: 'demo-client-fernanda', nome: 'Fernanda Lima' },
    responsavel: { id: 'demo-member-maria', nome: 'Maria Oliveira', avatarUrl: null },
    proximaDataRelevante: null,
    ultimaAtualizacaoEm: '2026-07-29T11:30:00.000Z',
    versao: 1,
    tipo: 'JUDICIAL',
  },
  {
    id: 'demo-case-3',
    titulo: 'Construtora Horizonte — Revisão Contratual',
    numeroCnj: null,
    status: 'ATIVO',
    prioridade: 'MEDIA',
    area: 'Empresarial',
    tribunal: null,
    comarca: null,
    segredoJustica: false,
    cliente: { id: 'demo-client-horizonte', nome: 'Construtora Horizonte Ltda.' },
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null },
    proximaDataRelevante: null,
    ultimaAtualizacaoEm: '2026-07-20T09:00:00.000Z',
    versao: 1,
    tipo: 'JUDICIAL',
  },
  {
    id: 'demo-case-sigiloso',
    titulo: 'Guarda e Alimentos — processo sob segredo de justiça',
    numeroCnj: null,
    status: 'ATIVO',
    prioridade: 'CRITICA',
    area: 'Família',
    tribunal: 'TJSP',
    comarca: 'São Paulo',
    segredoJustica: true,
    cliente: { id: 'demo-client-roberto', nome: 'Roberto Almeida' },
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null },
    proximaDataRelevante: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    ultimaAtualizacaoEm: '2026-07-10T00:00:00.000Z',
    versao: 1,
    tipo: 'JUDICIAL',
  },
  {
    id: 'case-extra-1',
    titulo: 'Negociação extrajudicial — Roberto Almeida',
    numeroCnj: null,
    status: 'ATIVO',
    prioridade: 'MEDIA',
    area: 'Cível',
    tribunal: null,
    comarca: null,
    segredoJustica: false,
    cliente: { id: 'demo-client-roberto', nome: 'Roberto Almeida' },
    responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null },
    proximaDataRelevante: null,
    ultimaAtualizacaoEm: '2026-08-11T10:00:00.000Z',
    versao: 1,
    tipo: 'EXTRAJUDICIAL',
  },
];

const demoCaseTeam: Record<
  string,
  Array<{
    id: string;
    membroId: string;
    nome: string;
    avatarUrl: string | null;
    funcaoNoProcesso: string | null;
    responsavelPrincipal: boolean;
    acessoPermitido: string;
    entrouEm: string;
  }>
> = {
  'demo-case-1': [
    {
      id: 'demo-vinculo-1',
      membroId: DEMO_MEMBRO_ID,
      nome: 'João Silva',
      avatarUrl: null,
      funcaoNoProcesso: null,
      responsavelPrincipal: true,
      acessoPermitido: 'LEITURA_ESCRITA',
      entrouEm: '2025-03-10T12:00:00.000Z',
    },
    {
      id: 'demo-vinculo-2',
      membroId: 'demo-member-pedro',
      nome: 'Pedro Costa',
      avatarUrl: null,
      funcaoNoProcesso: 'Assistente',
      responsavelPrincipal: false,
      acessoPermitido: 'LEITURA_ESCRITA',
      entrouEm: '2025-04-01T12:00:00.000Z',
    },
  ],
};

interface DemoDeadline {
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

/** "8 prazos hoje" pedido explicitamente para a demonstração. */
const demoCaseDeadlines: Record<string, DemoDeadline[]> = {
  'demo-case-1': [
    {
      id: 'demo-prazo-1',
      titulo: 'Contestação',
      descricao: null,
      tipo: 'FATAL',
      dataVencimento: new Date().toISOString(),
      responsavelId: DEMO_MEMBRO_ID,
      prioridade: 'ALTA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
    {
      id: 'demo-prazo-3',
      titulo: 'Protocolo de recurso',
      descricao: null,
      tipo: 'INTERNO',
      dataVencimento: new Date().toISOString(),
      responsavelId: DEMO_MEMBRO_ID,
      prioridade: 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
    {
      id: 'demo-prazo-4',
      titulo: 'Revisão de petição',
      descricao: null,
      tipo: 'TAREFA',
      dataVencimento: new Date().toISOString(),
      responsavelId: 'demo-member-pedro',
      prioridade: 'BAIXA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
    {
      id: 'demo-prazo-5',
      titulo: 'Reunião com o cliente',
      descricao: null,
      tipo: 'REUNIAO',
      dataVencimento: new Date().toISOString(),
      responsavelId: DEMO_MEMBRO_ID,
      prioridade: 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
    {
      id: 'demo-prazo-6',
      titulo: 'Prazo processual — manifestação',
      descricao: null,
      tipo: 'FATAL',
      dataVencimento: new Date().toISOString(),
      responsavelId: 'demo-member-maria',
      prioridade: 'CRITICA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
  ],
  'demo-case-2': [
    {
      id: 'demo-prazo-2',
      titulo: 'Audiência de conciliação',
      descricao: null,
      tipo: 'AUDIENCIA',
      dataVencimento: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      responsavelId: 'demo-member-maria',
      prioridade: 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
    {
      id: 'demo-prazo-7',
      titulo: 'Envio de documentação',
      descricao: null,
      tipo: 'TAREFA',
      dataVencimento: new Date().toISOString(),
      responsavelId: 'demo-member-maria',
      prioridade: 'ALTA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
  ],
  'demo-case-3': [
    {
      id: 'demo-prazo-8',
      titulo: 'Revisão contratual',
      descricao: null,
      tipo: 'TAREFA',
      dataVencimento: new Date().toISOString(),
      responsavelId: DEMO_MEMBRO_ID,
      prioridade: 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
  ],
  'demo-case-sigiloso': [
    {
      id: 'demo-prazo-9',
      titulo: 'Audiência de guarda',
      descricao: null,
      tipo: 'AUDIENCIA',
      dataVencimento: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      responsavelId: DEMO_MEMBRO_ID,
      prioridade: 'CRITICA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    },
  ],
};

const legalCasesDemoHandlers = [
  http.get(`${base}/legal-cases`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const tipo = url.searchParams.get('tipo');
    const byType = tipo ? demoLegalCases.filter((c) => c.tipo === tipo) : demoLegalCases;
    const items = q ? byType.filter((c) => c.titulo.toLowerCase().includes(q)) : byType;
    return HttpResponse.json({ items, nextCursor: null, total: items.length });
  }),
  http.post(`${base}/legal-cases`, async ({ request }) => {
    const body = (await request.json()) as {
      titulo?: string;
      numeroCnj?: string;
      clienteId?: string;
      area?: string;
      tipo?: 'JUDICIAL' | 'EXTRAJUDICIAL';
    };
    const cliente = demoClients.find((c) => c.id === body.clienteId);
    const created: DemoLegalCase = {
      id: `demo-case-${demoLegalCases.length + 1}`,
      titulo: body.titulo ?? 'Novo processo',
      numeroCnj: body.numeroCnj?.replace(/\D/g, '') ?? null,
      status: 'ATIVO',
      prioridade: 'MEDIA',
      area: body.area ?? 'Cível',
      tribunal: null,
      comarca: null,
      segredoJustica: false,
      cliente: cliente
        ? { id: cliente.id, nome: cliente.nome }
        : { id: body.clienteId ?? '', nome: 'Cliente' },
      responsavel: { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null },
      proximaDataRelevante: null,
      ultimaAtualizacaoEm: new Date().toISOString(),
      versao: 1,
      tipo: body.tipo ?? 'JUDICIAL',
    };
    demoLegalCases = [created, ...demoLegalCases];
    return HttpResponse.json({ id: created.id }, { status: 201 });
  }),
  http.get(`${base}/legal-cases/:id`, ({ params }) => {
    const legalCase = demoLegalCases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    return HttpResponse.json({
      ...legalCase,
      descricao: null,
      numeroInterno: null,
      tipoAcao: null,
      tipo: legalCase.tipo,
      vara: null,
      uf: 'SP',
      instancia: 'PRIMEIRA',
      classeProcessual: null,
      assunto: null,
      poloCliente: 'ATIVO',
      valorCausaCentavos: null,
      moedaValorCausa: 'BRL',
      dataDistribuicao: null,
      dataEncerramento: null,
      observacoes: null,
      criadoEm: '2025-03-10T12:00:00.000Z',
      atualizadoEm: legalCase.ultimaAtualizacaoEm,
      arquivadoEm: null,
      resumoIaVigente: null,
      tagsAtivas: [],
    });
  }),
  http.patch(`${base}/legal-cases/:id`, async ({ params, request }) => {
    const legalCase = demoLegalCases.find((c) => c.id === params.id);
    if (!legalCase) return problem(404, 'NOT_FOUND', 'Processo não encontrado.');
    const ifMatch = request.headers.get('if-match');
    if (ifMatch !== String(legalCase.versao)) {
      return problem(409, 'STALE_VERSION', 'Este processo foi atualizado por outra pessoa.');
    }
    Object.assign(legalCase, await request.json());
    legalCase.versao += 1;
    return HttpResponse.json({ versao: legalCase.versao });
  }),
  http.delete(`${base}/legal-cases/:id`, ({ params }) => {
    demoLegalCases = demoLegalCases.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/legal-cases/:id/archive`, ({ params }) => {
    const legalCase = demoLegalCases.find((c) => c.id === params.id);
    if (legalCase) legalCase.status = 'ARQUIVADO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/legal-cases/:id/restore`, ({ params }) => {
    const legalCase = demoLegalCases.find((c) => c.id === params.id);
    if (legalCase) legalCase.status = 'ATIVO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/legal-cases/:id/team`, ({ params }) =>
    HttpResponse.json(demoCaseTeam[params.id as string] ?? []),
  ),
  http.post(`${base}/legal-cases/:id/team`, async ({ params, request }) => {
    const body = (await request.json()) as { membroId?: string };
    const membro = demoMembers.find((m) => m.id === body.membroId);
    const caseId = params.id as string;
    demoCaseTeam[caseId] = demoCaseTeam[caseId] ?? [];
    const novo = {
      id: `demo-vinculo-${demoCaseTeam[caseId].length + 1}`,
      membroId: body.membroId ?? '',
      nome: membro?.usuario.nome ?? 'Membro',
      avatarUrl: null,
      funcaoNoProcesso: null,
      responsavelPrincipal: false,
      acessoPermitido: 'LEITURA_ESCRITA',
      entrouEm: new Date().toISOString(),
    };
    demoCaseTeam[caseId] = [...demoCaseTeam[caseId], novo];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),
  http.patch(`${base}/legal-cases/:id/responsible`, async ({ params, request }) => {
    const body = (await request.json()) as { membroId?: string };
    const caseId = params.id as string;
    demoCaseTeam[caseId] = (demoCaseTeam[caseId] ?? []).map((m) => ({
      ...m,
      responsavelPrincipal: m.membroId === body.membroId,
    }));
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/legal-cases/:id/team/:membroId`, ({ params }) => {
    const caseId = params.id as string;
    demoCaseTeam[caseId] = (demoCaseTeam[caseId] ?? []).filter(
      (m) => m.membroId !== params.membroId,
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/legal-cases/:id/parties`, () => HttpResponse.json([])),

  http.get(`${base}/legal-cases/:id/deadlines`, ({ params }) =>
    HttpResponse.json(demoCaseDeadlines[params.id as string] ?? []),
  ),
  http.post(`${base}/legal-cases/:id/deadlines`, async ({ params, request }) => {
    const caseId = params.id as string;
    const body = (await request.json()) as Partial<DemoDeadline>;
    demoCaseDeadlines[caseId] = demoCaseDeadlines[caseId] ?? [];
    const novo: DemoDeadline = {
      id: `demo-prazo-${Date.now()}`,
      titulo: body.titulo ?? 'Novo prazo',
      descricao: body.descricao ?? null,
      tipo: body.tipo ?? 'TAREFA',
      dataVencimento: body.dataVencimento ?? new Date().toISOString(),
      responsavelId: body.responsavelId ?? DEMO_MEMBRO_ID,
      prioridade: body.prioridade ?? 'MEDIA',
      status: 'PENDENTE',
      motivoCancelamento: null,
    };
    demoCaseDeadlines[caseId] = [...demoCaseDeadlines[caseId], novo];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),
  http.patch(`${base}/legal-cases/:id/deadlines/:prazoId`, async ({ params, request }) => {
    const prazo = (demoCaseDeadlines[params.id as string] ?? []).find(
      (p) => p.id === params.prazoId,
    );
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    Object.assign(prazo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/legal-cases/:id/deadlines/:prazoId`, ({ params }) => {
    const prazo = (demoCaseDeadlines[params.id as string] ?? []).find(
      (p) => p.id === params.prazoId,
    );
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    if (prazo.tipo === 'FATAL' && !prazo.motivoCancelamento) {
      return problem(422, 'JUSTIFICATION_REQUIRED', 'Cancelar um prazo fatal exige justificativa.');
    }
    prazo.status = 'CANCELADO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/complete`, ({ params }) => {
    const prazo = (demoCaseDeadlines[params.id as string] ?? []).find(
      (p) => p.id === params.prazoId,
    );
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    prazo.status = 'CONCLUIDO';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/reopen`, ({ params }) => {
    const prazo = (demoCaseDeadlines[params.id as string] ?? []).find(
      (p) => p.id === params.prazoId,
    );
    if (!prazo) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    prazo.status = 'PENDENTE';
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/legal-cases/:id/deadlines/:prazoId/duplicate`, ({ params }) => {
    const caseId = params.id as string;
    const original = (demoCaseDeadlines[caseId] ?? []).find((p) => p.id === params.prazoId);
    if (!original) return problem(404, 'NOT_FOUND', 'Prazo não encontrado.');
    const copia: DemoDeadline = {
      ...original,
      id: `demo-prazo-${Date.now()}`,
      titulo: `${original.titulo} (cópia)`,
      status: 'PENDENTE',
    };
    demoCaseDeadlines[caseId] = [...demoCaseDeadlines[caseId], copia];
    return HttpResponse.json({ id: copia.id }, { status: 201 });
  }),
];

// ---------------------------------------------------------------------
// Deadlines agregado (demo) — Sprint 08, `GET /deadlines` real.
// ---------------------------------------------------------------------
const deadlinesAggregateDemoHandlers = [
  http.get(`${base}/deadlines`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const responsavelIdFiltro = url.searchParams.get('responsavelId');
    const escopo = url.searchParams.get('escopo') ?? 'meus';

    const items = Object.entries(demoCaseDeadlines).flatMap(([caseId, prazos]) => {
      const legalCase = demoLegalCases.find((c) => c.id === caseId);
      if (!legalCase) return [];
      return prazos.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        tipo: p.tipo,
        origem: 'MANUAL',
        dataVencimento: p.dataVencimento,
        prioridade: p.prioridade,
        status: p.status,
        criadoEm: '2026-07-01T00:00:00.000Z',
        processo: { id: legalCase.id, titulo: legalCase.titulo, numeroCnj: legalCase.numeroCnj },
        cliente: { id: legalCase.cliente.id, nome: legalCase.cliente.nome },
        responsavel: (() => {
          const membro = demoMembers.find((m) => m.id === p.responsavelId);
          return membro
            ? { id: membro.id, nome: membro.usuario.nome, avatarUrl: membro.usuario.avatarUrl }
            : null;
        })(),
      }));
    });

    const filtrados = items
      .filter((i) => (q ? i.titulo.toLowerCase().includes(q) : true))
      .filter((i) => (responsavelIdFiltro ? i.responsavel?.id === responsavelIdFiltro : true))
      .filter((i) => (escopo === 'meus' ? i.responsavel?.id === DEMO_MEMBRO_ID : true));

    return HttpResponse.json({ items: filtrados, nextCursor: null });
  }),
];

// ---------------------------------------------------------------------
// Timeline (demo) — Sprint 08, real desde então; cada processo demo
// ganha alguns eventos automáticos já pré-preenchidos.
// ---------------------------------------------------------------------
interface DemoTimelineEvent {
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

const demoCaseTimeline: Record<string, DemoTimelineEvent[]> = {
  'demo-case-1': [
    {
      id: 'demo-evento-1',
      tipo: 'CRIACAO_PROCESSO',
      titulo: 'Processo "Silva vs. Condomínio Aurora" criado',
      descricao: null,
      dataEvento: '2025-03-10T12:00:00.000Z',
      origem: 'SISTEMA',
      autor: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
      entidadeRelacionada: null,
      fixado: true,
      editavel: false,
    },
    {
      id: 'demo-evento-2',
      tipo: 'EQUIPE_ALTERADA',
      titulo: 'Pedro Costa adicionado à equipe',
      descricao: null,
      dataEvento: '2025-04-01T12:00:00.000Z',
      origem: 'SISTEMA',
      autor: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
      entidadeRelacionada: { tipo: 'membro', id: 'demo-member-pedro' },
      fixado: false,
      editavel: false,
    },
    {
      id: 'demo-evento-3',
      tipo: 'ANOTACAO',
      titulo: 'Cliente confirmou documentação por e-mail',
      descricao: 'Roberto enviou os comprovantes solicitados na última reunião.',
      dataEvento: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      origem: 'MANUAL',
      autor: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
      entidadeRelacionada: null,
      fixado: false,
      editavel: true,
    },
  ],
};

const timelineDemoHandlers = [
  http.get(`${base}/legal-cases/:id/timeline`, ({ params, request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const tipoFiltro = url.searchParams.get('tipo');
    let items = demoCaseTimeline[params.id as string] ?? [];
    if (q) items = items.filter((e) => e.titulo.toLowerCase().includes(q));
    if (tipoFiltro) {
      const tipos = tipoFiltro.split(',');
      items = items.filter((e) => tipos.includes(e.tipo));
    }
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.post(`${base}/legal-cases/:id/timeline`, async ({ params, request }) => {
    const caseId = params.id as string;
    const body = (await request.json()) as { tipo?: string; titulo?: string; descricao?: string };
    demoCaseTimeline[caseId] = demoCaseTimeline[caseId] ?? [];
    const novo: DemoTimelineEvent = {
      id: `demo-evento-manual-${Date.now()}`,
      tipo: body.tipo ?? 'ANOTACAO',
      titulo: body.titulo ?? '',
      descricao: body.descricao ?? null,
      dataEvento: new Date().toISOString(),
      origem: 'MANUAL',
      autor: { id: DEMO_MEMBRO_ID, nome: 'João Silva' },
      entidadeRelacionada: null,
      fixado: false,
      editavel: true,
    };
    demoCaseTimeline[caseId] = [novo, ...demoCaseTimeline[caseId]];
    return HttpResponse.json({ id: novo.id }, { status: 201 });
  }),
  http.patch(`${base}/legal-cases/:id/timeline/:eventoId`, async ({ params, request }) => {
    const evento = (demoCaseTimeline[params.id as string] ?? []).find(
      (e) => e.id === params.eventoId,
    );
    if (!evento) return problem(404, 'NOT_FOUND', 'Evento não encontrado.');
    if (evento.origem !== 'MANUAL')
      return problem(403, 'SYSTEM_EVENT_NOT_DELETABLE', 'Evento do sistema.');
    const body = (await request.json()) as { fixado?: boolean };
    if (body.fixado !== undefined) evento.fixado = body.fixado;
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/legal-cases/:id/timeline/:eventoId`, ({ params }) => {
    const caseId = params.id as string;
    const evento = (demoCaseTimeline[caseId] ?? []).find((e) => e.id === params.eventoId);
    if (!evento) return problem(404, 'NOT_FOUND', 'Evento não encontrado.');
    if (evento.origem !== 'MANUAL')
      return problem(403, 'SYSTEM_EVENT_NOT_DELETABLE', 'Evento do sistema.');
    demoCaseTimeline[caseId] = demoCaseTimeline[caseId].filter((e) => e.id !== params.eventoId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/timeline`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 8);
    const all = Object.entries(demoCaseTimeline)
      .flatMap(([caseId, events]) => {
        const legalCase = demoLegalCases.find((c) => c.id === caseId);
        return events.map((e) => ({
          id: e.id,
          tipo: e.tipo,
          titulo: e.titulo,
          dataEvento: e.dataEvento,
          processo: { id: caseId, titulo: legalCase?.titulo ?? 'Processo' },
          autor: e.autor ? { nome: e.autor.nome } : null,
        }));
      })
      .sort((a, b) => b.dataEvento.localeCompare(a.dataEvento));
    return HttpResponse.json(all.slice(0, limit));
  }),
];

// ---------------------------------------------------------------------
// Dashboard (demo) — "42 processos, 8 prazos, 17 documentos" pedido
// explicitamente para a demonstração; Documents continua sem módulo
// real, ver features/dashboard/api/dashboard.api.ts. "Meus Processos"
// usa `/legal-cases` (real), "Agenda do Dia"/"Prazos Críticos"/"Carga de
// Trabalho" usam `/deadlines` (real, `deadlinesAggregateDemoHandlers`
// acima) e "Atividade Recente" usa `/timeline` (real, `timelineDemoHandlers`
// acima) — nenhum dos três mockado aqui desde a Sprint 08.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Documents / Folders (Sprint 09) — reafirma docs/api/10-documents.md.
// "Documentos Recentes"/"Armazenamento" do Dashboard passam a usar
// `GET /documents/dashboard-summary` real (substitui o antigo
// `/dashboard-mock/recent-documents`, removido nesta rodada).
// ---------------------------------------------------------------------
interface DemoDocument {
  id: string;
  nome: string;
  nomeOriginal: string;
  extensao: string;
  mimeType: string;
  tamanhoBytes: string;
  tipo: string;
  categoria: string | null;
  descricao: string | null;
  confidencialidade: 'PADRAO' | 'CONFIDENCIAL';
  visibilidade: string;
  statusUpload: string;
  statusProcessamento: string;
  statusAntivirus: string;
  versaoAtual: number;
  totalVersoes: number;
  dataDocumento: string | null;
  pasta: { id: string; nome: string } | null;
  processo: { id: string; titulo: string } | null;
  cliente: { id: string; nome: string } | null;
  autor: { id: string; nome: string; avatarUrl: string | null } | null;
  tags: Array<{ id: string; nome: string; cor: string }>;
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
  excluidoEm: string | null;
  legalFolderIds?: string[];
}

const AUTOR_DEMO = { id: DEMO_MEMBRO_ID, nome: 'João Silva', avatarUrl: null };

let demoDocuments: DemoDocument[] = [
  {
    id: 'demo-doc-1',
    nome: 'Petição inicial — Silva vs. Condomínio Aurora.pdf',
    nomeOriginal: 'peticao-inicial.pdf',
    extensao: 'pdf',
    mimeType: 'application/pdf',
    tamanhoBytes: '482304',
    tipo: 'PETICAO',
    categoria: 'Processual',
    descricao: 'Petição inicial protocolada.',
    confidencialidade: 'PADRAO',
    visibilidade: 'INTERNA',
    statusUpload: 'CONCLUIDO',
    statusProcessamento: 'PRONTO',
    statusAntivirus: 'LIMPO',
    versaoAtual: 2,
    totalVersoes: 2,
    dataDocumento: '2026-06-15',
    pasta: { id: 'demo-pasta-processual', nome: 'Processual' },
    processo: { id: 'demo-case-1', titulo: 'Silva vs. Condomínio Aurora' },
    cliente: { id: 'demo-client-roberto', nome: 'Roberto Almeida' },
    autor: AUTOR_DEMO,
    tags: [{ id: 'demo-tag-urgente', nome: 'Urgente', cor: '#ef4444' }],
    favorito: true,
    criadoEm: '2026-06-15T09:00:00.000Z',
    atualizadoEm: new Date().toISOString(),
    excluidoEm: null,
    legalFolderIds: ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'],
  },
  {
    id: 'demo-doc-2',
    nome: 'Procuração — Fernanda Lima.pdf',
    nomeOriginal: 'procuracao-fernanda.pdf',
    extensao: 'pdf',
    mimeType: 'application/pdf',
    tamanhoBytes: '112640',
    tipo: 'PROCURACAO',
    categoria: null,
    descricao: null,
    confidencialidade: 'PADRAO',
    visibilidade: 'INTERNA',
    statusUpload: 'CONCLUIDO',
    statusProcessamento: 'PRONTO',
    statusAntivirus: 'LIMPO',
    versaoAtual: 1,
    totalVersoes: 1,
    dataDocumento: null,
    pasta: null,
    processo: { id: 'demo-case-2', titulo: 'Oliveira — Rescisão Trabalhista' },
    cliente: { id: 'demo-client-fernanda', nome: 'Fernanda Lima' },
    autor: { id: 'demo-member-maria', nome: 'Maria Oliveira', avatarUrl: null },
    tags: [],
    favorito: false,
    criadoEm: '2026-07-28T09:00:00.000Z',
    atualizadoEm: '2026-07-28T09:00:00.000Z',
    excluidoEm: null,
    legalFolderIds: [],
  },
  {
    id: 'demo-doc-3',
    nome: 'Contrato revisado — Horizonte.docx',
    nomeOriginal: 'contrato-revisado.docx',
    extensao: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    tamanhoBytes: '87552',
    tipo: 'CONTRATO',
    categoria: 'Societário',
    descricao: null,
    confidencialidade: 'PADRAO',
    visibilidade: 'INTERNA',
    statusUpload: 'CONCLUIDO',
    statusProcessamento: 'PRONTO',
    statusAntivirus: 'LIMPO',
    versaoAtual: 3,
    totalVersoes: 3,
    dataDocumento: null,
    pasta: { id: 'demo-pasta-contratos', nome: 'Contratos' },
    processo: { id: 'demo-case-3', titulo: 'Construtora Horizonte — Revisão Contratual' },
    cliente: { id: 'demo-client-horizonte', nome: 'Construtora Horizonte Ltda.' },
    autor: AUTOR_DEMO,
    tags: [{ id: 'demo-tag-societario', nome: 'Societário', cor: '#6366f1' }],
    favorito: false,
    criadoEm: '2026-07-01T14:00:00.000Z',
    atualizadoEm: '2026-07-27T14:00:00.000Z',
    excluidoEm: null,
    legalFolderIds: ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'],
  },
  {
    id: 'demo-doc-4',
    nome: 'Comprovante de pagamento antigo.jpg',
    nomeOriginal: 'comprovante.jpg',
    extensao: 'jpg',
    mimeType: 'image/jpeg',
    tamanhoBytes: '204800',
    tipo: 'COMPROVANTE',
    categoria: null,
    descricao: null,
    confidencialidade: 'PADRAO',
    visibilidade: 'INTERNA',
    statusUpload: 'CONCLUIDO',
    statusProcessamento: 'PRONTO',
    statusAntivirus: 'LIMPO',
    versaoAtual: 1,
    totalVersoes: 1,
    dataDocumento: null,
    pasta: null,
    processo: null,
    cliente: null,
    autor: AUTOR_DEMO,
    tags: [],
    favorito: false,
    criadoEm: '2026-05-01T10:00:00.000Z',
    atualizadoEm: '2026-05-01T10:00:00.000Z',
    excluidoEm: '2026-07-10T10:00:00.000Z',
  },
];
const demoPendingUploads: Record<
  string,
  {
    nome: string;
    processoId?: string;
    pastaId?: string;
    clienteId?: string;
    resourceType?: 'PASTA_JURIDICA';
    resourceId?: string;
  }
> = {};

interface DemoFolder {
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

let demoFolders: DemoFolder[] = [
  {
    id: 'demo-pasta-contratos',
    nome: 'Contratos',
    pastaPaiId: null,
    processoId: null,
    ordem: 0,
    totalDocumentos: 1,
    favorito: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-pasta-processual',
    nome: 'Processual',
    pastaPaiId: null,
    processoId: null,
    ordem: 1,
    totalDocumentos: 1,
    favorito: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-pasta-2026',
    nome: '2026',
    pastaPaiId: 'demo-pasta-processual',
    processoId: null,
    ordem: 0,
    totalDocumentos: 0,
    favorito: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  },
];

const documentsDemoHandlers = [
  http.get(`${base}/documents/dashboard-summary`, () => {
    const ativos = demoDocuments.filter((d) => !d.excluidoEm);
    const bytesUsados = ativos.reduce((sum, d) => sum + Number(d.tamanhoBytes), 0);
    return HttpResponse.json({
      recentes: [...ativos]
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          nome: d.nome,
          extensao: d.extensao,
          tipo: d.tipo,
          atualizadoEm: d.atualizadoEm,
        })),
      favoritos: ativos
        .filter((d) => d.favorito)
        .map((d) => ({
          id: d.id,
          nome: d.nome,
          extensao: d.extensao,
          tipo: d.tipo,
          atualizadoEm: d.atualizadoEm,
        })),
      totalDocumentos: ativos.length,
      armazenamento: {
        bytesUsados: String(bytesUsados),
        bytesQuota: '21474836480',
        percentualUsado: Math.round((bytesUsados / 21_474_836_480) * 100),
      },
    });
  }),

  http.get(`${base}/documents`, ({ request }) => {
    const url = new URL(request.url);
    const visao = url.searchParams.get('visao') ?? 'todos';
    const q = url.searchParams.get('q')?.toLowerCase();
    const pastaId = url.searchParams.get('pastaId');
    const processoId = url.searchParams.get('processoId');
    const clienteId = url.searchParams.get('clienteId');
    const resourceType = url.searchParams.get('resourceType');
    const resourceId = url.searchParams.get('resourceId');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 30);
    const sort = url.searchParams.get('sort') ?? '-atualizadoEm';

    if (visao === 'compartilhados') {
      return HttpResponse.json({ items: [], nextCursor: null, disponivel: false });
    }

    let items = demoDocuments.filter((d) => (visao === 'lixeira' ? d.excluidoEm : !d.excluidoEm));
    if (visao === 'favoritos') items = items.filter((d) => d.favorito);
    if (visao === 'versionados') items = items.filter((d) => d.totalVersoes > 1);
    if (q) items = items.filter((d) => d.nome.toLowerCase().includes(q));
    if (pastaId) items = items.filter((d) => d.pasta?.id === pastaId);
    if (processoId) items = items.filter((d) => d.processo?.id === processoId);
    if (clienteId) items = items.filter((d) => d.cliente?.id === clienteId);
    if (resourceType === 'PASTA_JURIDICA') {
      items = items.filter((document) =>
        resourceId ? document.legalFolderIds?.includes(resourceId) : false,
      );
    }

    const descending = sort.startsWith('-');
    const field = sort.replace(/^-/, '') as 'atualizadoEm' | 'criadoEm' | 'nome';
    items = [...items].sort((a, b) => {
      const comparison = String(a[field]).localeCompare(String(b[field]), 'pt-BR');
      return descending ? -comparison : comparison;
    });
    const total = items.length;
    items = items.slice((page - 1) * limit, page * limit);

    return HttpResponse.json({ items, nextCursor: null, total, disponivel: true });
  }),

  http.post(`${base}/documents/presign`, async ({ request }) => {
    const body = (await request.json()) as {
      nomeArquivo: string;
      processoId?: string;
      pastaId?: string;
      clienteId?: string;
      resourceType?: 'PASTA_JURIDICA';
      resourceId?: string;
    };
    const id = `demo-doc-novo-${demoDocuments.length + 1}`;
    demoPendingUploads[id] = {
      nome: body.nomeArquivo,
      processoId: body.processoId,
      pastaId: body.pastaId,
      clienteId: body.clienteId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    };
    return HttpResponse.json(
      {
        documentoId: id,
        uploadUrl: `${base}/storage/mock/upload/${id}`,
        expiraEm: new Date(Date.now() + 900_000).toISOString(),
      },
      { status: 201 },
    );
  }),

  http.put(`${base}/storage/mock/upload/:id`, () => new HttpResponse(null, { status: 201 })),

  http.post(`${base}/documents/:id/confirm`, ({ params }) => {
    const id = params.id as string;
    const pending = demoPendingUploads[id];
    if (!pending) {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'NOT_FOUND',
          status: 404,
          detail: 'Upload não encontrado.',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }
    delete demoPendingUploads[id];
    const novo: DemoDocument = {
      id,
      nome: pending.nome,
      nomeOriginal: pending.nome,
      extensao: pending.nome.split('.').pop() ?? '',
      mimeType: 'application/octet-stream',
      tamanhoBytes: '1024',
      tipo: 'OUTRO',
      categoria: null,
      descricao: null,
      confidencialidade: 'PADRAO',
      visibilidade: 'INTERNA',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versaoAtual: 1,
      totalVersoes: 1,
      dataDocumento: null,
      pasta: pending.pastaId ? { id: pending.pastaId, nome: 'Pasta' } : null,
      processo: pending.processoId ? { id: pending.processoId, titulo: 'Processo' } : null,
      cliente: pending.clienteId ? { id: pending.clienteId, nome: 'Cliente' } : null,
      autor: AUTOR_DEMO,
      tags: [],
      favorito: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      excluidoEm: null,
      legalFolderIds:
        pending.resourceType === 'PASTA_JURIDICA' && pending.resourceId
          ? [pending.resourceId]
          : [],
    };
    demoDocuments = [novo, ...demoDocuments];
    return HttpResponse.json({ id, avisoDuplicidade: null }, { status: 201 });
  }),

  http.get(`${base}/documents/:id`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(doc);
  }),

  http.patch(`${base}/documents/:id`, async ({ params, request }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    Object.assign(doc, await request.json());
    doc.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/documents/:id`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    doc.excluidoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/documents/:id/links/legal-folder/:folderId`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    doc.legalFolderIds = (doc.legalFolderIds ?? []).filter((id) => id !== params.folderId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/documents/:id/restore`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    doc.excluidoEm = null;
    return new HttpResponse(null, { status: 201 });
  }),

  http.post(`${base}/documents/:id/duplicate`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const copia: DemoDocument = { ...doc, id: `${doc.id}-copia`, nome: `${doc.nome} (cópia)` };
    demoDocuments = [copia, ...demoDocuments];
    return HttpResponse.json({ id: copia.id }, { status: 201 });
  }),

  http.patch(`${base}/documents/:id/move`, async ({ params, request }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { pastaId?: string | null; processoId?: string | null };
    if (body.pastaId !== undefined) {
      doc.pasta = body.pastaId
        ? (demoFolders.find((f) => f.id === body.pastaId) ?? { id: body.pastaId, nome: 'Pasta' })
        : null;
    }
    if (body.processoId !== undefined)
      doc.processo = body.processoId ? { id: body.processoId, titulo: 'Processo' } : null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/documents/:id/favorite`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    doc.favorito = !doc.favorito;
    return HttpResponse.json({ favorito: doc.favorito });
  }),

  http.get(`${base}/documents/:id/download`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json({
      url: `https://mock-storage.invalid/${doc.id}`,
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
    });
  }),

  http.get(`${base}/documents/:id/preview`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json({
      url: `https://mock-storage.invalid/${doc.id}`,
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
      mimeType: doc.mimeType,
    });
  }),

  http.get(`${base}/documents/:id/versions`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(
      Array.from({ length: doc.totalVersoes }, (_, i) => ({
        id: `demo-versao-${doc.id}-${doc.totalVersoes - i}`,
        numero: doc.totalVersoes - i,
        tamanhoBytes: doc.tamanhoBytes,
        comentarioVersao: i === 0 ? null : 'Revisão de cláusula contratual',
        vigente: i === 0,
        autor: doc.autor,
        criadoEm: doc.atualizadoEm,
      })),
    );
  }),

  http.get(`${base}/documents/:id/versions/:versaoId/download`, ({ params }) =>
    HttpResponse.json({
      url: `https://mock-storage.invalid/${params.versaoId}`,
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
    }),
  ),

  http.post(`${base}/documents/:id/versions/presign`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json({
      uploadUrl: `${base}/storage/mock/upload/${doc.id}-nova-versao`,
      expiraEm: new Date(Date.now() + 900_000).toISOString(),
      proximoNumero: doc.totalVersoes + 1,
      versionToken: `demo-token-${doc.id}`,
    });
  }),

  http.post(`${base}/documents/:id/versions/confirm`, ({ params }) => {
    const doc = demoDocuments.find((d) => d.id === params.id);
    if (!doc) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    doc.totalVersoes += 1;
    doc.versaoAtual += 1;
    return HttpResponse.json(
      { id: `demo-versao-${doc.id}-${doc.totalVersoes}`, numero: doc.totalVersoes },
      { status: 201 },
    );
  }),

  http.get(`${base}/tags`, () =>
    HttpResponse.json([
      { id: 'demo-tag-urgente', nome: 'Urgente', cor: '#ef4444' },
      { id: 'demo-tag-societario', nome: 'Societário', cor: '#6366f1' },
    ]),
  ),
  http.post(`${base}/tags`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; cor?: string };
    return HttpResponse.json(
      { id: `demo-tag-${Date.now()}`, nome: body.nome, cor: body.cor ?? '#6366f1' },
      { status: 201 },
    );
  }),
];

const foldersDemoHandlers = [
  http.get(`${base}/folders`, ({ request }) => {
    const url = new URL(request.url);
    const processoId = url.searchParams.get('processoId');
    const q = url.searchParams.get('q')?.toLowerCase();
    let items = demoFolders.filter((f) => (f.processoId ?? null) === (processoId ?? null));
    if (q) items = items.filter((f) => f.nome.toLowerCase().includes(q));
    return HttpResponse.json(items);
  }),

  http.post(`${base}/folders`, async ({ request }) => {
    const body = (await request.json()) as {
      nome: string;
      processoId?: string;
      pastaPaiId?: string;
    };
    const nova: DemoFolder = {
      id: `demo-pasta-nova-${demoFolders.length + 1}`,
      nome: body.nome,
      pastaPaiId: body.pastaPaiId ?? null,
      processoId: body.processoId ?? null,
      ordem: demoFolders.length,
      totalDocumentos: 0,
      favorito: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    demoFolders = [...demoFolders, nova];
    return HttpResponse.json({ id: nova.id }, { status: 201 });
  }),

  http.patch(`${base}/folders/:id`, async ({ params, request }) => {
    const folder = demoFolders.find((f) => f.id === params.id);
    if (!folder) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { nome?: string; pastaPaiId?: string | null };
    if (body.nome !== undefined) folder.nome = body.nome;
    if (body.pastaPaiId !== undefined) folder.pastaPaiId = body.pastaPaiId;
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/folders/:id/reorder`, async ({ params, request }) => {
    const folder = demoFolders.find((f) => f.id === params.id);
    if (!folder) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { ordem: number };
    folder.ordem = body.ordem;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/folders/:id`, ({ params, request }) => {
    const folder = demoFolders.find((f) => f.id === params.id);
    if (!folder) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const url = new URL(request.url);
    const cascata = url.searchParams.get('cascata') === 'true';
    if (folder.totalDocumentos > 0 && !cascata) {
      return HttpResponse.json(
        { code: 'FOLDER_NOT_EMPTY', title: 'FOLDER_NOT_EMPTY', status: 409 },
        { status: 409 },
      );
    }
    demoFolders = demoFolders.filter((f) => f.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/folders/:id/restore`, ({ params }) => {
    const folder = demoFolders.find((f) => f.id === params.id);
    if (!folder) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return new HttpResponse(null, { status: 201 });
  }),

  http.post(`${base}/folders/:id/favorite`, ({ params }) => {
    const folder = demoFolders.find((f) => f.id === params.id);
    if (!folder) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    folder.favorito = !folder.favorito;
    return HttpResponse.json({ favorito: folder.favorito });
  }),
];

const dashboardDemoHandlers = [
  http.get(`${base}/dashboard-mock/portfolio-metrics`, () =>
    HttpResponse.json({
      processosAtivos: 42,
      prazosEmRisco: 8,
      processosParados: 3,
      novosClientesNoMes: 5,
    }),
  ),

  http.get(`${base}/dashboard-mock/notifications-preview`, () =>
    HttpResponse.json({
      naoLidas: 6,
      recentes: [
        {
          id: 'demo-notif-1',
          titulo: 'Maria Oliveira comentou no processo Silva vs. Condomínio Aurora',
          criadaEm: new Date().toISOString(),
        },
        {
          id: 'demo-notif-2',
          titulo: 'Prazo vence hoje: Contestação',
          criadaEm: new Date().toISOString(),
        },
        {
          id: 'demo-notif-3',
          titulo: '17 documentos processados com sucesso esta semana',
          criadaEm: '2026-07-28T18:00:00.000Z',
        },
      ],
    }),
  ),
];

const SEARCH_GROUP_ORDER = [
  'clients',
  'legal-cases',
  'documents',
  'deadlines',
  'team',
  'folders',
  'timeline',
  'tags',
  'comments',
] as const;

/** Reafirma docs/api/15-search.md — Sprint 10. Índice fixo sobre as mesmas entidades demo já usadas pelos demais handlers acima. */
const SEARCH_DEMO_ITEMS = [
  {
    id: 'demo-case-1',
    tipo: 'legal-cases' as const,
    titulo: 'Silva vs. Condomínio Aurora',
    subtitulo: '0001234-56.2026.8.26.0100',
    snippet: null,
    url: '/processos/demo-case-1',
    score: 1,
    metadata: {
      status: 'ATIVO',
      prioridade: 'ALTA',
      cliente: { id: 'demo-client-roberto', nome: 'Roberto Almeida' },
    },
  },
  {
    id: 'demo-client-roberto',
    tipo: 'clients' as const,
    titulo: 'Roberto Almeida',
    subtitulo: 'Pessoa física',
    snippet: null,
    url: '/clientes/demo-client-roberto',
    score: 0.92,
    metadata: { tipo: 'PESSOA_FISICA', documento: '529.982.247-25' },
  },
  {
    id: 'demo-doc-1',
    tipo: 'documents' as const,
    titulo: 'Procuração — Roberto Almeida.pdf',
    subtitulo: 'Silva vs. Condomínio Aurora',
    snippet: '…outorga plenos poderes a <mark>Roberto</mark> Almeida…',
    url: '/documentos/demo-doc-1',
    score: 0.81,
    metadata: { extensao: 'pdf', versao: 1 },
  },
  {
    id: 'demo-prazo-1',
    tipo: 'deadlines' as const,
    titulo: 'Contestação',
    subtitulo: 'Silva vs. Condomínio Aurora',
    snippet: null,
    url: '/processos/demo-case-1?tab=prazos',
    score: 0.7,
    metadata: { status: 'PENDENTE', prioridade: 'ALTA' },
  },
];

const searchDemoHandlers = [
  http.get(`${base}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const typesParam = url.searchParams.get('types');
    const requestedTypes = typesParam ? typesParam.split(',') : [...SEARCH_GROUP_ORDER];

    const matched = SEARCH_DEMO_ITEMS.filter((item) => item.titulo.toLowerCase().includes(q));
    const groups = SEARCH_GROUP_ORDER.filter((type) => requestedTypes.includes(type)).map(
      (type) => {
        const items = matched.filter((item) => item.tipo === type);
        return {
          type,
          total: items.length,
          items,
          ...(type === 'comments' ? { disponivel: false } : {}),
        };
      },
    );

    return HttpResponse.json({ query: q, groups });
  }),

  http.get(`${base}/search/suggestions`, () =>
    HttpResponse.json({
      sugestoes: [
        { label: 'Novo Cliente', action: 'navigate', url: '/clientes' },
        { label: 'Enviar Documento', action: 'navigate', url: '/documentos' },
      ],
    }),
  ),
];

// Reafirma Sprint 11 (Assistente Jurídico Inteligente) — mesmo racional dos
// demais grupos demo: dados ricos amarrados às entidades demo já existentes
// (`demo-case-1`, `demo-client-roberto`, `demo-doc-1`), separado da fixture
// fixa de teste (`mocks/handlers/ai.ts`).
interface DemoAiSummary {
  id: string;
  escopoTipo: string;
  processoId: string | null;
  documentoId: string | null;
  clienteId: string | null;
  tipoResumo: string;
  versaoResumo: number;
  status: string;
  conteudo: string | null;
  modelo: string;
  promptVersion: string;
  feedback: string | null;
  comentarioFeedback: string | null;
  vigente: boolean;
  geradoEm: string | null;
  criadoEm: string;
  streamUrl: string;
}

const demoAiSummaries: DemoAiSummary[] = [];
let demoAiNextId = 1;

function demoAiScopeMatch(summary: DemoAiSummary, escopoTipo: string, escopoId: string) {
  if (escopoTipo === 'DOCUMENTO') return summary.documentoId === escopoId;
  if (escopoTipo === 'CLIENTE') return summary.clienteId === escopoId;
  return summary.processoId === escopoId;
}

function demoAiConteudo(escopoTipo: string, tipoResumo: string): string {
  if (escopoTipo === 'DOCUMENTO') {
    return (
      'Procuração — Roberto Almeida.pdf outorga plenos poderes ao escritório para representação judicial. ' +
      'Metadados analisados (nome, tipo, processo relacionado) — o conteúdo integral do PDF ainda não é extraído nesta versão.'
    );
  }
  if (escopoTipo === 'CLIENTE') {
    return (
      'Roberto Almeida possui 1 processo ativo (Silva vs. Condomínio Aurora), sem pendências críticas. ' +
      'Cadastro atualizado recentemente. Nenhum risco identificado no momento.'
    );
  }
  const porTipo: Record<string, string> = {
    GERAL:
      'Ação de cobrança de despesas condominiais movida por Roberto Almeida contra o Condomínio Aurora. ' +
      'Processo ativo, prioridade alta, próxima audiência de conciliação se aproximando.',
    EXECUTIVO:
      'Status: ativo, risco moderado. Próxima ação: comparecer à audiência de conciliação. Sem pendências administrativas.',
    CRONOLOGICO:
      'O processo foi distribuído e, desde então, avançou por uma petição inicial, resposta do réu e ' +
      'agendamento de audiência de conciliação — cada etapa manteve o processo em andamento normal, sem atrasos.',
    PONTOS_CHAVE:
      '- Autor: Roberto Almeida\n- Réu: Condomínio Aurora\n- Pedido: cobrança de despesas condominiais\n- Status: ativo',
    RISCOS:
      'Risco moderado: valor da causa relevante e audiência próxima exigem preparo da equipe; nenhum prazo em atraso identificado.',
  };
  return porTipo[tipoResumo] ?? porTipo.GERAL;
}

function demoAiDefaultTipo(escopoTipo: string): string {
  if (escopoTipo === 'DOCUMENTO') return 'RESUMO_DOCUMENTO';
  if (escopoTipo === 'CLIENTE') return 'HISTORICO_CLIENTE';
  return 'GERAL';
}

function demoAiCreate(escopoTipo: string, escopoId: string, tipoResumo: string): DemoAiSummary {
  const anterior = demoAiSummaries.find(
    (s) => demoAiScopeMatch(s, escopoTipo, escopoId) && s.tipoResumo === tipoResumo && s.vigente,
  );
  if (anterior) anterior.vigente = false;

  const id = `demo-resumo-${demoAiNextId++}`;
  const summary: DemoAiSummary = {
    id,
    escopoTipo,
    processoId: escopoTipo === 'PROCESSO' ? escopoId : null,
    documentoId: escopoTipo === 'DOCUMENTO' ? escopoId : null,
    clienteId: escopoTipo === 'CLIENTE' ? escopoId : null,
    tipoResumo,
    versaoResumo: (anterior?.versaoResumo ?? 0) + 1,
    status: 'PRONTO',
    conteudo: demoAiConteudo(escopoTipo, tipoResumo),
    modelo: 'mock-v1',
    promptVersion: 'demo@v1',
    feedback: null,
    comentarioFeedback: null,
    vigente: true,
    geradoEm: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
    streamUrl: `/ai-summaries/${id}/stream`,
  };
  demoAiSummaries.push(summary);
  return summary;
}

function demoAiRequestHandler(escopoTipo: string, path: string) {
  return http.post(`${base}/${path}/:id/ai-summaries`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { tipoResumo?: string };
    const summary = demoAiCreate(
      escopoTipo,
      params.id as string,
      body.tipoResumo ?? demoAiDefaultTipo(escopoTipo),
    );
    return HttpResponse.json(
      { id: summary.id, status: summary.status, streamUrl: summary.streamUrl },
      { status: 202 },
    );
  });
}

function demoAiListHandler(escopoTipo: string, path: string) {
  return http.get(`${base}/${path}/:id/ai-summaries`, ({ params }) =>
    HttpResponse.json(
      demoAiSummaries.filter((s) => demoAiScopeMatch(s, escopoTipo, params.id as string)),
    ),
  );
}

const aiDemoHandlers = [
  demoAiRequestHandler('PROCESSO', 'legal-cases'),
  demoAiRequestHandler('DOCUMENTO', 'documents'),
  demoAiRequestHandler('CLIENTE', 'clients'),
  demoAiListHandler('PROCESSO', 'legal-cases'),
  demoAiListHandler('DOCUMENTO', 'documents'),
  demoAiListHandler('CLIENTE', 'clients'),

  http.get(`${base}/ai-summaries/:id/sources`, ({ params }) => {
    const summary = demoAiSummaries.find((s) => s.id === params.id);
    if (!summary) return HttpResponse.json([]);
    return HttpResponse.json([
      {
        id: 'demo-fonte-1',
        sourceType:
          summary.escopoTipo === 'DOCUMENTO'
            ? 'DOCUMENTO'
            : summary.escopoTipo === 'CLIENTE'
              ? 'CLIENTE'
              : 'METADADO_PROCESSO',
        documentoId: summary.documentoId,
        eventoTimelineId: null,
        processoId: summary.processoId,
        clienteId: summary.clienteId,
        ordem: 1,
        trechoOuReferencia:
          summary.escopoTipo === 'PROCESSO'
            ? 'Silva vs. Condomínio Aurora'
            : 'Metadados analisados',
      },
    ]);
  }),

  http.post(`${base}/ai-summaries/:id/regenerate`, ({ params }) => {
    const anterior = demoAiSummaries.find((s) => s.id === params.id);
    if (!anterior) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const escopoId = (anterior.processoId ?? anterior.documentoId ?? anterior.clienteId)!;
    const novo = demoAiCreate(anterior.escopoTipo, escopoId, anterior.tipoResumo);
    return HttpResponse.json(
      { id: novo.id, status: novo.status, streamUrl: novo.streamUrl },
      { status: 202 },
    );
  }),

  http.post(`${base}/ai-summaries/:id/cancel`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${base}/ai-summaries/:id/feedback`, async ({ params, request }) => {
    const summary = demoAiSummaries.find((s) => s.id === params.id);
    const body = (await request.json()) as { feedback: string; comentarioFeedback?: string };
    if (summary) {
      summary.feedback = body.feedback;
      summary.comentarioFeedback = body.comentarioFeedback ?? null;
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/ai/chat`, async ({ request }) => {
    const body = (await request.json()) as {
      escopo: { tipo: string; id?: string };
      pergunta: string;
    };
    const resposta =
      body.escopo.tipo === 'GLOBAL'
        ? `Encontrei resultados relacionados a "${body.pergunta}" na Busca Global — veja os processos e documentos do escritório Silva & Associados.`
        : `Com base no contexto atual: ${body.pergunta.toLowerCase().includes('prazo') ? 'a próxima audiência de conciliação é o próximo marco relevante.' : 'não há pendências críticas identificadas.'}`;
    return HttpResponse.json({
      resposta,
      fontes: [
        {
          tipo: 'legal-cases',
          id: 'demo-case-1',
          titulo: 'Silva vs. Condomínio Aurora',
          url: '/processos/demo-case-1',
        },
      ],
      modelo: 'mock-v1',
      tempoGeracaoMs: 18,
    });
  }),

  http.get(`${base}/ai/dashboard-insights`, () =>
    HttpResponse.json({
      insights: [
        'Hoje existem 2 prazos críticos vencendo nos próximos 3 dias.',
        'O processo "Silva vs. Condomínio Aurora" está há 5 dias sem movimentação.',
      ],
    }),
  ),

  http.get(`${base}/office/ai-usage`, () =>
    HttpResponse.json({
      mesReferencia: '2026-08',
      resumosGerados: 18,
      cotaMensal: 500,
      custoEstimadoCentavosTotal: 540,
      porTipo: { GERAL: 10, RESUMO_DOCUMENTO: 5, HISTORICO_CLIENTE: 3 },
    }),
  ),
];

// ============================================================================
// Configuration Engine (Sprint 13 / Prompt 13) — mesmo formato de dados de
// `mocks/handlers/configuration.ts`, deliberadamente uma cópia independente
// (nunca compartilhada com as fixtures do Vitest).
// ============================================================================
let demoGeneralSettings = {
  fusoHorario: 'America/Sao_Paulo',
  idioma: 'pt-BR',
  formatoData: 'DD/MM/YYYY',
  moedaPadrao: 'BRL',
  diaInicioSemana: 1,
  notificacoesPadrao: true,
};
let demoFinancialSettings = {
  formaCalculoHonorarioPadrao: 'PERCENTUAL',
  percentualHonorarioPadrao: 20,
  diasVencimentoPadrao: 30,
};
let demoAiSettings = {
  providerPadrao: 'fake',
  modeloPadrao: null as string | null,
  cotaMensalPersonalizada: null as number | null,
  exigirRevisaoHumana: false,
};
const demoExtraFields = [
  {
    id: 'demo-campo-1',
    entidade: 'CLIENTE',
    nome: 'Data de Nascimento',
    chave: 'data_nascimento',
    tipo: 'DATA',
    obrigatorio: false,
    opcoes: [] as string[],
    ordem: 0,
    ativo: true,
  },
  {
    id: 'demo-campo-2',
    entidade: 'PROCESSO',
    nome: 'Origem do Caso',
    chave: 'origem_caso',
    tipo: 'SELECT',
    obrigatorio: true,
    opcoes: ['Indicação', 'Site', 'Recorrente'],
    ordem: 0,
    ativo: true,
  },
];
const demoRequiredFields = [
  { entidade: 'CLIENTE', campo: 'enderecoLogradouro', obrigatorio: true },
  { entidade: 'PROCESSO', campo: 'valorCausa', obrigatorio: false },
];
const demoValueSets = [
  {
    id: 'demo-conjunto-1',
    nome: 'Área do Direito',
    descricao: 'Áreas de atuação do escritório' as string | null,
    ativo: true,
    itens: [
      { id: 'demo-item-1', valor: 'Cível', ordem: 0, ativo: true },
      { id: 'demo-item-2', valor: 'Trabalhista', ordem: 1, ativo: true },
      { id: 'demo-item-3', valor: 'Tributário', ordem: 2, ativo: true },
    ],
  },
];
const demoTaskCategories = [
  { id: 'demo-categoria-1', nome: 'Prazos Fatais', cor: '#EF4444', ordem: 0, ativo: true },
  { id: 'demo-categoria-2', nome: 'Administrativo', cor: '#6366F1', ordem: 1, ativo: true },
];
const demoCollaboratorGroups = [
  {
    id: 'demo-grupo-1',
    nome: 'Equipe Cível',
    descricao: null as string | null,
    ativo: true,
    membros: [{ id: DEMO_MEMBRO_ID, nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}` }],
  },
];
const demoTaskTemplates = [
  {
    id: 'demo-modelo-1',
    nome: 'Contestação Padrão',
    descricao: null as string | null,
    categoriaId: 'demo-categoria-1',
    categoria: { id: 'demo-categoria-1', nome: 'Prazos Fatais', cor: '#EF4444' } as {
      id: string;
      nome: string;
      cor: string;
    } | null,
    prazoDiasPadrao: 15,
    prioridadePadrao: 'ALTA',
    checklist: ['Revisar fatos', 'Anexar documentos'],
    ativo: true,
  },
];
const demoHolidays = [
  {
    id: 'demo-feriado-1',
    nome: 'Natal',
    data: '2026-12-25',
    tipo: 'NACIONAL',
    uf: null as string | null,
    recorrenteAnual: true,
    ativo: true,
  },
  {
    id: 'demo-feriado-2',
    nome: 'Aniversário da Cidade',
    data: '2026-09-15',
    tipo: 'MUNICIPAL',
    uf: 'SP',
    recorrenteAnual: true,
    ativo: true,
  },
];

const configurationDemoHandlers = [
  http.get(`${base}/configuration/dashboard-summary`, () =>
    HttpResponse.json({
      quantidadeCamposExtra: demoExtraFields.length,
      quantidadeCategorias: demoTaskCategories.length,
      quantidadeConjuntos: demoValueSets.length,
      quantidadeModelos: demoTaskTemplates.length,
      quantidadeGrupos: demoCollaboratorGroups.length,
      quantidadeUsuarios: 6,
      quantidadeProvidersIa: 5,
      consumoIa: {
        mesReferencia: '2026-08',
        resumosGerados: 18,
        cotaMensal: 500,
        custoEstimadoCentavosTotal: 540,
      },
      ultimasAlteracoes: [
        {
          id: 'demo-log-1',
          acao: 'CREATE_EXTRA_FIELD',
          recursoTipo: 'CAMPO_EXTRA',
          recursoId: 'demo-campo-2',
          atorId: DEMO_USER.id,
          criadoEm: new Date('2026-08-02T14:00:00.000Z').toISOString(),
        },
        {
          id: 'demo-log-2',
          acao: 'CREATE_HOLIDAY',
          recursoTipo: 'FERIADO',
          recursoId: 'demo-feriado-2',
          atorId: DEMO_USER.id,
          criadoEm: new Date('2026-08-01T09:30:00.000Z').toISOString(),
        },
      ],
    }),
  ),
  http.get(`${base}/configuration/general`, () => HttpResponse.json(demoGeneralSettings)),
  http.patch(`${base}/configuration/general`, async ({ request }) => {
    demoGeneralSettings = { ...demoGeneralSettings, ...((await request.json()) as object) };
    return HttpResponse.json(demoGeneralSettings);
  }),
  http.get(`${base}/configuration/financial`, () => HttpResponse.json(demoFinancialSettings)),
  http.patch(`${base}/configuration/financial`, async ({ request }) => {
    demoFinancialSettings = { ...demoFinancialSettings, ...((await request.json()) as object) };
    return HttpResponse.json(demoFinancialSettings);
  }),
  http.get(`${base}/configuration/ai`, () =>
    HttpResponse.json({
      ...demoAiSettings,
      providersDisponiveis: ['fake', 'openai', 'anthropic', 'gemini', 'ollama'],
    }),
  ),
  http.patch(`${base}/configuration/ai`, async ({ request }) => {
    demoAiSettings = { ...demoAiSettings, ...((await request.json()) as object) };
    return HttpResponse.json({
      ...demoAiSettings,
      providersDisponiveis: ['fake', 'openai', 'anthropic', 'gemini', 'ollama'],
    });
  }),
  http.get(`${base}/configuration/extra-fields`, ({ request }) => {
    const entidade = new URL(request.url).searchParams.get('entidade');
    return HttpResponse.json(
      entidade ? demoExtraFields.filter((f) => f.entidade === entidade) : demoExtraFields,
    );
  }),
  http.post(`${base}/configuration/extra-fields`, async ({ request }) => {
    const body = (await request.json()) as Omit<(typeof demoExtraFields)[number], 'id' | 'ativo'>;
    const id = `demo-campo-${demoExtraFields.length + 1}`;
    demoExtraFields.push({ ...body, id, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/extra-fields/:id`, async ({ params, request }) => {
    const campo = demoExtraFields.find((f) => f.id === params.id);
    if (campo) Object.assign(campo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/extra-fields/:id`, ({ params }) => {
    const index = demoExtraFields.findIndex((f) => f.id === params.id);
    if (index >= 0) demoExtraFields.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/configuration/required-fields`, () => HttpResponse.json(demoRequiredFields)),
  http.patch(`${base}/configuration/required-fields`, async ({ request }) => {
    const body = (await request.json()) as {
      itens: Array<{ entidade: string; campo: string; obrigatorio: boolean }>;
    };
    for (const item of body.itens) {
      const existing = demoRequiredFields.find(
        (f) => f.entidade === item.entidade && f.campo === item.campo,
      );
      if (existing) existing.obrigatorio = item.obrigatorio;
      else demoRequiredFields.push(item);
    }
    return HttpResponse.json(demoRequiredFields);
  }),
  http.get(`${base}/configuration/value-sets`, () => HttpResponse.json(demoValueSets)),
  http.post(`${base}/configuration/value-sets`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string };
    const id = `demo-conjunto-${demoValueSets.length + 1}`;
    demoValueSets.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ativo: true,
      itens: [],
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.delete(`${base}/configuration/value-sets/:id`, ({ params }) => {
    const index = demoValueSets.findIndex((v) => v.id === params.id);
    if (index >= 0) demoValueSets.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${base}/configuration/value-sets/:id/items`, async ({ params, request }) => {
    const conjunto = demoValueSets.find((v) => v.id === params.id);
    if (!conjunto) return HttpResponse.json({ title: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { valor: string; ordem?: number };
    const id = `demo-item-${Math.random().toString(36).slice(2, 8)}`;
    conjunto.itens.push({ id, valor: body.valor, ordem: body.ordem ?? 0, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.delete(`${base}/configuration/value-sets/:id/items/:itemId`, ({ params }) => {
    const conjunto = demoValueSets.find((v) => v.id === params.id);
    if (conjunto) conjunto.itens = conjunto.itens.filter((i) => i.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/configuration/task-categories`, () => HttpResponse.json(demoTaskCategories)),
  http.post(`${base}/configuration/task-categories`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; cor?: string };
    const id = `demo-categoria-${demoTaskCategories.length + 1}`;
    demoTaskCategories.push({
      id,
      nome: body.nome,
      cor: body.cor ?? '#6366F1',
      ordem: 0,
      ativo: true,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/task-categories/:id`, async ({ params, request }) => {
    const categoria = demoTaskCategories.find((c) => c.id === params.id);
    if (categoria) Object.assign(categoria, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/task-categories/:id`, ({ params }) => {
    const index = demoTaskCategories.findIndex((c) => c.id === params.id);
    if (index >= 0) demoTaskCategories.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/configuration/collaborator-groups`, () =>
    HttpResponse.json(demoCollaboratorGroups),
  ),
  http.post(`${base}/configuration/collaborator-groups`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string };
    const id = `demo-grupo-${demoCollaboratorGroups.length + 1}`;
    demoCollaboratorGroups.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ativo: true,
      membros: [],
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/collaborator-groups/:id`, async ({ params, request }) => {
    const grupo = demoCollaboratorGroups.find((g) => g.id === params.id);
    if (grupo) Object.assign(grupo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/collaborator-groups/:id`, ({ params }) => {
    const index = demoCollaboratorGroups.findIndex((g) => g.id === params.id);
    if (index >= 0) demoCollaboratorGroups.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(
    `${base}/configuration/collaborator-groups/:id/members`,
    async ({ params, request }) => {
      const grupo = demoCollaboratorGroups.find((g) => g.id === params.id);
      if (!grupo) return HttpResponse.json({ title: 'NOT_FOUND' }, { status: 404 });
      const body = (await request.json()) as { membroId: string };
      if (!grupo.membros.some((m) => m.id === body.membroId)) {
        grupo.membros.push({ id: body.membroId, nome: 'Colaborador' });
      }
      return new HttpResponse(null, { status: 201 });
    },
  ),
  http.delete(`${base}/configuration/collaborator-groups/:id/members/:membroId`, ({ params }) => {
    const grupo = demoCollaboratorGroups.find((g) => g.id === params.id);
    if (grupo) grupo.membros = grupo.membros.filter((m) => m.id !== params.membroId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/configuration/cargos`, () => HttpResponse.json(demoCargos)),
  http.post(`${base}/configuration/cargos`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string; ordem?: number };
    const id = `demo-cargo-${demoCargos.length + 1}`;
    demoCargos.push({
      id,
      nome: body.nome,
      descricao: body.descricao ?? null,
      ordem: body.ordem ?? demoCargos.length,
      ativo: true,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/cargos/:id`, async ({ params, request }) => {
    const cargo = demoCargos.find((c) => c.id === params.id);
    if (cargo) Object.assign(cargo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/cargos/:id`, ({ params }) => {
    demoCargos = demoCargos.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/configuration/task-templates`, () => HttpResponse.json(demoTaskTemplates)),
  http.post(`${base}/configuration/task-templates`, async ({ request }) => {
    const body = (await request.json()) as Omit<
      (typeof demoTaskTemplates)[number],
      'id' | 'categoria' | 'ativo'
    >;
    const categoria = demoTaskCategories.find((c) => c.id === body.categoriaId) ?? null;
    const id = `demo-modelo-${demoTaskTemplates.length + 1}`;
    demoTaskTemplates.push({ ...body, id, categoria, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/task-templates/:id`, async ({ params, request }) => {
    const modelo = demoTaskTemplates.find((t) => t.id === params.id);
    if (modelo) Object.assign(modelo, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/task-templates/:id`, ({ params }) => {
    const index = demoTaskTemplates.findIndex((t) => t.id === params.id);
    if (index >= 0) demoTaskTemplates.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${base}/configuration/holidays`, () => HttpResponse.json(demoHolidays)),
  http.post(`${base}/configuration/holidays`, async ({ request }) => {
    const body = (await request.json()) as Omit<(typeof demoHolidays)[number], 'id' | 'ativo'>;
    const id = `demo-feriado-${demoHolidays.length + 1}`;
    demoHolidays.push({ ...body, id, ativo: true });
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.patch(`${base}/configuration/holidays/:id`, async ({ params, request }) => {
    const feriado = demoHolidays.find((h) => h.id === params.id);
    if (feriado) Object.assign(feriado, await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${base}/configuration/holidays/:id`, ({ params }) => {
    const index = demoHolidays.findIndex((h) => h.id === params.id);
    if (index >= 0) demoHolidays.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

/**
 * Task Engine (Prompt 14) — mesmo contrato de `mocks/handlers/tasks.ts`,
 * com dados fictícios próprios do modo demonstração (cruzando com
 * `demo-categoria-*`/`demo-client-roberto`/`demo-case-1` já existentes).
 * Status/Prioridade simulam o auto-provisionamento real de
 * `TaskValueSetsService` — nunca um enum fixo.
 */
const demoStatusItems = [
  { id: 'demo-status-a-fazer', valor: 'A Fazer' },
  { id: 'demo-status-fazendo', valor: 'Fazendo' },
  { id: 'demo-status-concluidos', valor: 'Concluídos' },
  { id: 'demo-status-cancelados', valor: 'Cancelados' },
];
const demoPrioridadeItems = [
  { id: 'demo-prioridade-baixa', valor: 'Baixa' },
  { id: 'demo-prioridade-media', valor: 'Média' },
  { id: 'demo-prioridade-alta', valor: 'Alta' },
  { id: 'demo-prioridade-critica', valor: 'Crítica' },
];

interface DemoTask {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: { id: string; nome: string; cor: string } | null;
  status: { id: string; valor: string } | null;
  prioridade: { id: string; valor: string } | null;
  responsavel: { id: string; nome: string; avatarUrl: string | null } | null;
  responsaveisAuxiliares: Array<{ id: string; nome: string; avatarUrl: string | null }>;
  equipeId: string | null;
  grupoColaboradoresId: string | null;
  dataInicio: string | null;
  dataVencimento: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  arquivadaEm: string | null;
  recorrenciaId: string | null;
  tarefaOrigemId: string | null;
  checklist: Array<{
    id: string;
    titulo: string;
    obrigatorio: boolean;
    ordem: number;
    concluidoEm: string | null;
  }>;
  vinculos: Array<{ id: string; tipoRecurso: string; recursoId: string }>;
  dependeDeIds: string[];
  favoritaPor: string[];
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

let demoTasks: DemoTask[] = [
  {
    id: 'demo-tarefa-1',
    titulo: 'Protocolar contestação — Silva vs. Condomínio Aurora',
    descricao: 'Revisar a minuta com o sócio antes de protocolar.',
    categoria: { id: 'demo-categoria-1', nome: 'Prazos Fatais', cor: '#EF4444' },
    status: demoStatusItems[1],
    prioridade: demoPrioridadeItems[2],
    responsavel: {
      id: DEMO_MEMBRO_ID,
      nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}`,
      avatarUrl: null,
    },
    responsaveisAuxiliares: [{ id: 'demo-member-maria', nome: 'Maria Oliveira', avatarUrl: null }],
    equipeId: null,
    grupoColaboradoresId: 'demo-grupo-1',
    dataInicio: null,
    dataVencimento: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    concluidaEm: null,
    canceladaEm: null,
    motivoCancelamento: null,
    arquivadaEm: null,
    recorrenciaId: null,
    tarefaOrigemId: null,
    checklist: [
      {
        id: 'demo-checklist-1',
        titulo: 'Revisar fatos',
        obrigatorio: true,
        ordem: 0,
        concluidoEm: new Date('2026-08-01T10:00:00.000Z').toISOString(),
      },
      {
        id: 'demo-checklist-2',
        titulo: 'Anexar documentos',
        obrigatorio: false,
        ordem: 1,
        concluidoEm: null,
      },
    ],
    vinculos: [{ id: 'demo-vinculo-tarefa-1', tipoRecurso: 'PROCESSO', recursoId: 'demo-case-1' }],
    dependeDeIds: [],
    favoritaPor: [DEMO_MEMBRO_ID],
    criadoPorId: DEMO_MEMBRO_ID,
    criadoEm: '2026-07-28T00:00:00.000Z',
    atualizadoEm: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'demo-tarefa-2',
    titulo: 'Enviar proposta de honorários',
    descricao: null,
    categoria: { id: 'demo-categoria-2', nome: 'Administrativo', cor: '#6366F1' },
    status: demoStatusItems[0],
    prioridade: demoPrioridadeItems[1],
    responsavel: {
      id: DEMO_MEMBRO_ID,
      nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}`,
      avatarUrl: null,
    },
    responsaveisAuxiliares: [],
    equipeId: null,
    grupoColaboradoresId: null,
    dataInicio: null,
    dataVencimento: new Date(Date.now() - 86_400_000).toISOString(),
    concluidaEm: null,
    canceladaEm: null,
    motivoCancelamento: null,
    arquivadaEm: null,
    recorrenciaId: null,
    tarefaOrigemId: null,
    checklist: [],
    vinculos: [
      { id: 'demo-vinculo-tarefa-2', tipoRecurso: 'CLIENTE', recursoId: 'demo-client-roberto' },
    ],
    dependeDeIds: [],
    favoritaPor: [],
    criadoPorId: DEMO_MEMBRO_ID,
    criadoEm: '2026-07-25T00:00:00.000Z',
    atualizadoEm: '2026-07-25T00:00:00.000Z',
  },
  {
    id: 'demo-tarefa-3',
    titulo: 'Arquivar processo encerrado',
    descricao: null,
    categoria: null,
    status: demoStatusItems[3],
    prioridade: demoPrioridadeItems[0],
    responsavel: { id: 'demo-member-pedro', nome: 'Pedro Santos', avatarUrl: null },
    responsaveisAuxiliares: [],
    equipeId: null,
    grupoColaboradoresId: null,
    dataInicio: null,
    dataVencimento: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    concluidaEm: '2026-08-02T00:00:00.000Z',
    canceladaEm: null,
    motivoCancelamento: null,
    arquivadaEm: null,
    recorrenciaId: null,
    tarefaOrigemId: null,
    checklist: [],
    vinculos: [],
    dependeDeIds: ['demo-tarefa-2'],
    favoritaPor: [],
    criadoPorId: DEMO_MEMBRO_ID,
    criadoEm: '2026-07-10T00:00:00.000Z',
    atualizadoEm: '2026-08-02T00:00:00.000Z',
  },
];
const demoTaskComments: Array<{
  id: string;
  tarefaId: string;
  autorId: string;
  conteudo: string;
  criadoEm: string;
  editado: boolean;
}> = [
  {
    id: 'demo-comentario-tarefa-1',
    tarefaId: 'demo-tarefa-1',
    autorId: 'demo-member-maria',
    conteudo: 'Já revisei os fatos, falta só anexar os documentos do cliente.',
    criadoEm: '2026-08-01T11:00:00.000Z',
    editado: false,
  },
];
let demoTaskIdCounter = 1;
function demoTaskId(prefix: string) {
  return `demo-${prefix}-${demoTaskIdCounter++}`;
}

function demoTaskListItem(task: DemoTask) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return {
    id: task.id,
    titulo: task.titulo,
    categoria: task.categoria,
    status: task.status,
    prioridade: task.prioridade,
    responsavel: task.responsavel,
    dataVencimento: task.dataVencimento,
    concluidaEm: task.concluidaEm,
    canceladaEm: task.canceladaEm,
    arquivadaEm: task.arquivadaEm,
    favorita: task.favoritaPor.includes(DEMO_MEMBRO_ID),
    atrasada:
      !task.concluidaEm &&
      !task.canceladaEm &&
      !!task.dataVencimento &&
      new Date(task.dataVencimento) < hoje,
  };
}

function demoTaskDetail(task: DemoTask) {
  return {
    id: task.id,
    titulo: task.titulo,
    descricao: task.descricao,
    categoria: task.categoria,
    status: task.status,
    prioridade: task.prioridade,
    responsavel: task.responsavel,
    responsaveisAuxiliares: task.responsaveisAuxiliares,
    equipeId: task.equipeId,
    grupoColaboradoresId: task.grupoColaboradoresId,
    dataInicio: task.dataInicio,
    dataVencimento: task.dataVencimento,
    concluidaEm: task.concluidaEm,
    canceladaEm: task.canceladaEm,
    motivoCancelamento: task.motivoCancelamento,
    arquivadaEm: task.arquivadaEm,
    recorrenciaId: task.recorrenciaId,
    tarefaOrigemId: task.tarefaOrigemId,
    checklist: task.checklist,
    vinculos: task.vinculos,
    dependencias: task.dependeDeIds
      .map((id) => demoTasks.find((t) => t.id === id))
      .filter((t): t is DemoTask => !!t)
      .map((t) => ({ id: t.id, titulo: t.titulo, concluidaEm: t.concluidaEm })),
    bloqueando: demoTasks
      .filter((t) => t.dependeDeIds.includes(task.id))
      .map((t) => ({ id: t.id, titulo: t.titulo, concluidaEm: t.concluidaEm })),
    favorita: task.favoritaPor.includes(DEMO_MEMBRO_ID),
    criadoPorId: task.criadoPorId,
    criadoEm: task.criadoEm,
    atualizadoEm: task.atualizadoEm,
  };
}

const tasksDemoHandlers = [
  http.get(`${base}/tasks/config`, () =>
    HttpResponse.json({
      status: demoStatusItems.map((item, ordem) => ({ ...item, ordem })),
      prioridade: demoPrioridadeItems.map((item, ordem) => ({ ...item, ordem })),
    }),
  ),

  http.get(`${base}/tasks/dashboard-summary`, () => {
    const pendentes = demoTasks.filter((t) => !t.concluidaEm && !t.canceladaEm && !t.arquivadaEm);
    const minhas = pendentes.filter((t) => t.responsavel?.id === DEMO_MEMBRO_ID);
    const atrasadas = minhas.filter(
      (t) => t.dataVencimento && new Date(t.dataVencimento) < new Date(),
    );
    const concluidas = demoTasks.filter((t) => t.concluidaEm);
    return HttpResponse.json({
      minhasTarefasPendentes: minhas.length,
      equipeTarefasPendentes: pendentes.length,
      atrasadas: atrasadas.length,
      hoje: 0,
      proximas: minhas.length,
      concluidasNoMes: concluidas.length,
      produtividade: {
        concluidas: concluidas.length,
        criadas: demoTasks.length,
        percentual:
          demoTasks.length > 0 ? Math.round((concluidas.length / demoTasks.length) * 100) : 0,
      },
    });
  }),

  http.get(`${base}/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const statusId = url.searchParams.get('statusId');
    const categoriaId = url.searchParams.get('categoriaId');
    const prioridadeId = url.searchParams.get('prioridadeId');
    const responsavelId = url.searchParams.get('responsavelId');
    const clienteId = url.searchParams.get('clienteId');
    const processoId = url.searchParams.get('processoId');
    const favoritas = url.searchParams.get('favoritas') === 'true';
    const concluidas = url.searchParams.get('concluidas') === 'true';
    const pendentes = url.searchParams.get('pendentes') === 'true';
    const atrasadas = url.searchParams.get('atrasadas') === 'true';

    let filtered = demoTasks;
    if (q) filtered = filtered.filter((t) => t.titulo.toLowerCase().includes(q));
    if (statusId) filtered = filtered.filter((t) => t.status?.id === statusId);
    if (categoriaId) filtered = filtered.filter((t) => t.categoria?.id === categoriaId);
    if (prioridadeId) filtered = filtered.filter((t) => t.prioridade?.id === prioridadeId);
    if (responsavelId) filtered = filtered.filter((t) => t.responsavel?.id === responsavelId);
    if (clienteId)
      filtered = filtered.filter((t) =>
        t.vinculos.some((v) => v.tipoRecurso === 'CLIENTE' && v.recursoId === clienteId),
      );
    if (processoId)
      filtered = filtered.filter((t) =>
        t.vinculos.some((v) => v.tipoRecurso === 'PROCESSO' && v.recursoId === processoId),
      );
    if (favoritas) filtered = filtered.filter((t) => t.favoritaPor.includes(DEMO_MEMBRO_ID));
    if (concluidas) filtered = filtered.filter((t) => !!t.concluidaEm);
    if (pendentes)
      filtered = filtered.filter((t) => !t.concluidaEm && !t.canceladaEm && !t.arquivadaEm);
    if (atrasadas) {
      const hoje = new Date();
      filtered = filtered.filter(
        (t) =>
          !t.concluidaEm && !t.canceladaEm && t.dataVencimento && new Date(t.dataVencimento) < hoje,
      );
    }

    return HttpResponse.json({ items: filtered.map(demoTaskListItem), nextCursor: null });
  }),

  http.post(`${base}/tasks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = demoTaskId('tarefa');
    const checklist = (
      (body.checklist as Array<{ titulo: string; obrigatorio?: boolean; ordem?: number }>) ?? []
    ).map((item, index) => ({
      id: demoTaskId('checklist-item'),
      titulo: item.titulo,
      obrigatorio: item.obrigatorio ?? false,
      ordem: item.ordem ?? index,
      concluidoEm: null,
    }));
    const vinculos = (
      (body.vinculos as Array<{ tipoRecurso: string; recursoId: string }>) ?? []
    ).map((v) => ({
      id: demoTaskId('vinculo'),
      tipoRecurso: v.tipoRecurso,
      recursoId: v.recursoId,
    }));
    const categoria = demoTaskCategories.find((c) => c.id === body.categoriaId) ?? null;
    const novaTarefa: DemoTask = {
      id,
      titulo: (body.titulo as string) ?? 'Nova tarefa',
      descricao: (body.descricao as string) ?? null,
      categoria,
      status: demoStatusItems.find((s) => s.id === body.statusId) ?? demoStatusItems[0],
      prioridade:
        demoPrioridadeItems.find((p) => p.id === body.prioridadeId) ?? demoPrioridadeItems[1],
      responsavel: body.responsavelPrincipalId
        ? { id: DEMO_MEMBRO_ID, nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}`, avatarUrl: null }
        : null,
      responsaveisAuxiliares: [],
      equipeId: (body.equipeId as string) ?? null,
      grupoColaboradoresId: (body.grupoColaboradoresId as string) ?? null,
      dataInicio: (body.dataInicio as string) ?? null,
      dataVencimento: (body.dataVencimento as string) ?? null,
      concluidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
      arquivadaEm: null,
      recorrenciaId: body.recorrencia ? demoTaskId('recorrencia') : null,
      tarefaOrigemId: null,
      checklist,
      vinculos,
      dependeDeIds: (body.dependeDeIds as string[]) ?? [],
      favoritaPor: [],
      criadoPorId: DEMO_MEMBRO_ID,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    demoTasks = [novaTarefa, ...demoTasks];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.post(`${base}/tasks/from-template`, async ({ request }) => {
    const body = (await request.json()) as { modeloId?: string; responsavelPrincipalId?: string };
    const modelo = demoTaskTemplates.find((m) => m.id === body.modeloId) ?? demoTaskTemplates[0];
    const id = demoTaskId('tarefa');
    demoTasks = [
      {
        id,
        titulo: modelo.nome,
        descricao: modelo.descricao,
        categoria: modelo.categoria,
        status: demoStatusItems[0],
        prioridade:
          demoPrioridadeItems.find((p) => p.valor.toUpperCase() === modelo.prioridadePadrao) ??
          demoPrioridadeItems[1],
        responsavel: body.responsavelPrincipalId
          ? {
              id: DEMO_MEMBRO_ID,
              nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}`,
              avatarUrl: null,
            }
          : null,
        responsaveisAuxiliares: [],
        equipeId: null,
        grupoColaboradoresId: null,
        dataInicio: null,
        dataVencimento: new Date(Date.now() + modelo.prazoDiasPadrao * 86_400_000).toISOString(),
        concluidaEm: null,
        canceladaEm: null,
        motivoCancelamento: null,
        arquivadaEm: null,
        recorrenciaId: null,
        tarefaOrigemId: null,
        checklist: modelo.checklist.map((titulo, ordem) => ({
          id: demoTaskId('checklist-item'),
          titulo,
          obrigatorio: false,
          ordem,
          concluidoEm: null,
        })),
        vinculos: [],
        dependeDeIds: [],
        favoritaPor: [],
        criadoPorId: DEMO_MEMBRO_ID,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      ...demoTasks,
    ];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.get(`${base}/tasks/:id`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(demoTaskDetail(task));
  }),

  http.patch(`${base}/tasks/:id`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if ('titulo' in body) task.titulo = body.titulo as string;
    if ('descricao' in body) task.descricao = body.descricao as string | null;
    if ('statusId' in body)
      task.status = demoStatusItems.find((s) => s.id === body.statusId) ?? null;
    if ('prioridadeId' in body)
      task.prioridade = demoPrioridadeItems.find((p) => p.id === body.prioridadeId) ?? null;
    if ('dataInicio' in body) task.dataInicio = body.dataInicio as string | null;
    if ('dataVencimento' in body) task.dataVencimento = body.dataVencimento as string | null;
    task.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:id`, ({ params }) => {
    demoTasks = demoTasks.filter((t) => t.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/archive`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (task) task.arquivadaEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/restore`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (task) task.arquivadaEm = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/duplicate`, ({ params }) => {
    const original = demoTasks.find((t) => t.id === params.id);
    if (!original)
      return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const id = demoTaskId('tarefa');
    demoTasks = [
      {
        ...original,
        id,
        titulo: `${original.titulo} (cópia)`,
        favoritaPor: [],
        concluidaEm: null,
        canceladaEm: null,
      },
      ...demoTasks,
    ];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.post(`${base}/tasks/:id/move`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { statusId: string | null };
    task.status = demoStatusItems.find((s) => s.id === body.statusId) ?? null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/reopen`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (task) {
      task.concluidaEm = null;
      task.canceladaEm = null;
      task.motivoCancelamento = null;
      task.status = demoStatusItems[1];
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/complete`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const dependenciasPendentes = task.dependeDeIds
      .map((id) => demoTasks.find((t) => t.id === id))
      .some((t) => t && !t.concluidaEm);
    if (dependenciasPendentes) {
      return HttpResponse.json(
        { title: 'TASK_DEPENDENCIES_PENDING', code: 'TASK_DEPENDENCIES_PENDING' },
        { status: 409 },
      );
    }
    const checklistObrigatorioPendente = task.checklist.some(
      (item) => item.obrigatorio && !item.concluidoEm,
    );
    if (checklistObrigatorioPendente) {
      return HttpResponse.json(
        { title: 'TASK_CHECKLIST_PENDING', code: 'TASK_CHECKLIST_PENDING' },
        { status: 409 },
      );
    }
    task.concluidaEm = new Date().toISOString();
    task.status = demoStatusItems[2];
    return HttpResponse.json({ proximaOcorrenciaId: null });
  }),

  http.post(`${base}/tasks/:id/cancel`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { motivo?: string };
    task.canceladaEm = new Date().toISOString();
    task.motivoCancelamento = body.motivo ?? task.motivoCancelamento;
    task.status = demoStatusItems[3];
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:id/favorite`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.id);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    if (task.favoritaPor.includes(DEMO_MEMBRO_ID)) {
      task.favoritaPor = task.favoritaPor.filter((id) => id !== DEMO_MEMBRO_ID);
      return HttpResponse.json({ favorita: false });
    }
    task.favoritaPor.push(DEMO_MEMBRO_ID);
    return HttpResponse.json({ favorita: true });
  }),

  http.post(`${base}/tasks/:tarefaId/checklist`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as {
      titulo: string;
      obrigatorio?: boolean;
      ordem?: number;
    };
    const id = demoTaskId('checklist-item');
    task.checklist.push({
      id,
      titulo: body.titulo,
      obrigatorio: body.obrigatorio ?? false,
      ordem: body.ordem ?? task.checklist.length,
      concluidoEm: null,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/tasks/:tarefaId/checklist/:itemId`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    const item = task?.checklist.find((i) => i.id === params.itemId);
    if (!item) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as {
      titulo?: string;
      obrigatorio?: boolean;
      ordem?: number;
      concluido?: boolean;
    };
    if (body.titulo !== undefined) item.titulo = body.titulo;
    if (body.obrigatorio !== undefined) item.obrigatorio = body.obrigatorio;
    if (body.ordem !== undefined) item.ordem = body.ordem;
    if (body.concluido !== undefined)
      item.concluidoEm = body.concluido ? new Date().toISOString() : null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/checklist/:itemId`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (task) task.checklist = task.checklist.filter((i) => i.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/dependencies`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { dependeDeId: string };
    if (!task.dependeDeIds.includes(body.dependeDeId)) task.dependeDeIds.push(body.dependeDeId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/dependencies/:dependeDeId`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (task) task.dependeDeIds = task.dependeDeIds.filter((id) => id !== params.dependeDeId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/links`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { tipoRecurso: string; recursoId: string };
    const id = demoTaskId('vinculo');
    task.vinculos.push({ id, tipoRecurso: body.tipoRecurso, recursoId: body.recursoId });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.delete(`${base}/tasks/:tarefaId/links/:vinculoId`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (task) task.vinculos = task.vinculos.filter((v) => v.id !== params.vinculoId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/tasks/:tarefaId/responsibles`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { membroId: string };
    if (!task.responsaveisAuxiliares.some((m) => m.id === body.membroId)) {
      task.responsaveisAuxiliares.push({ id: body.membroId, nome: 'Colaborador', avatarUrl: null });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/tasks/:tarefaId/responsibles/:membroId`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (task)
      task.responsaveisAuxiliares = task.responsaveisAuxiliares.filter(
        (m) => m.id !== params.membroId,
      );
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/tasks/:tarefaId/comments`, ({ params }) =>
    HttpResponse.json(demoTaskComments.filter((c) => c.tarefaId === params.tarefaId)),
  ),

  http.post(`${base}/tasks/:tarefaId/comments`, async ({ params, request }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const body = (await request.json()) as { conteudo: string };
    const id = demoTaskId('comentario');
    demoTaskComments.push({
      id,
      tarefaId: params.tarefaId as string,
      autorId: DEMO_MEMBRO_ID,
      conteudo: body.conteudo,
      criadoEm: new Date().toISOString(),
      editado: false,
    });
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.get(`${base}/tasks/:tarefaId/timeline`, ({ params }) => {
    const task = demoTasks.find((t) => t.id === params.tarefaId);
    if (!task) return HttpResponse.json({ title: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    const items = [
      {
        id: `demo-evento-${task.id}-1`,
        tipo: 'CRIACAO_TAREFA',
        titulo: `Tarefa "${task.titulo}" criada`,
        descricao: null,
        dataEvento: task.criadoEm,
        origem: 'SISTEMA',
        autor: { id: task.criadoPorId, nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}` },
        entidadeRelacionada: null,
        fixado: false,
        editavel: false,
      },
    ];
    if (task.concluidaEm) {
      items.push({
        id: `demo-evento-${task.id}-2`,
        tipo: 'CONCLUSAO_TAREFA',
        titulo: `Tarefa "${task.titulo}" concluída`,
        descricao: null,
        dataEvento: task.concluidaEm,
        origem: 'SISTEMA',
        autor: { id: task.criadoPorId, nome: `${DEMO_USER.nome} ${DEMO_USER.sobrenome}` },
        entidadeRelacionada: null,
        fixado: false,
        editavel: false,
      });
    }
    return HttpResponse.json({ items: items.reverse(), nextCursor: null });
  }),
];

export const demoHandlers = [
  ...identityDemoHandlers,
  ...teamDemoHandlers,
  ...permissionsDemoHandlers,
  ...clientsDemoHandlers,
  ...legalCasesDemoHandlers,
  ...deadlinesAggregateDemoHandlers,
  ...timelineDemoHandlers,
  ...documentsDemoHandlers,
  ...foldersDemoHandlers,
  ...dashboardDemoHandlers,
  ...searchDemoHandlers,
  ...aiDemoHandlers,
  ...configurationDemoHandlers,
  ...tasksDemoHandlers,
  ...judicialCaptureHandlers,
  ...legalFoldersHandlers,
  ...publicationsHandlers,
  ...judicialMovementsHandlers,
  ...extrajudicialMovementsHandlers,
  ...auditHandlers,
  ...requestsHandlers,
];
