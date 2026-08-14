import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import {
  MOCK_CARGO_ADVOGADO_ID,
  MOCK_CARGO_ADVOGADO_SENIOR_ID,
  MOCK_CARGO_ANALISTA_ADM_ID,
  MOCK_CARGO_ESTAGIARIO_ID,
} from './configuration';

/**
 * Handlers derivados do contrato real de
 * apps/api/src/modules/memberships/ (mesma ressalva de identity.ts —
 * OpenAPI ainda não gerado). Usados só em teste; em desenvolvimento,
 * Memberships já é real e não deve ser interceptado.
 */
const base = env.NEXT_PUBLIC_API_URL;

/** Catálogo de Cargos mockado — mesmos ids de `./configuration`'s `state.cargos`, referenciado tanto no POST quanto no PATCH de `/members` para resolver `cargoId` -> `{id, nome}`. */
const MOCK_CARGOS = [
  { id: MOCK_CARGO_ADVOGADO_ID, nome: 'Advogado' },
  { id: MOCK_CARGO_ADVOGADO_SENIOR_ID, nome: 'Advogado Sênior' },
  { id: MOCK_CARGO_ESTAGIARIO_ID, nome: 'Estagiário' },
  { id: MOCK_CARGO_ANALISTA_ADM_ID, nome: 'Analista Administrativo' },
];

function problem(status: number, code: string, detail: string, fieldErrors?: unknown[]) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'mock-correlation-id',
      timestamp: new Date(0).toISOString(),
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status },
  );
}

export const ROLE_OWNER_ID = 'role-owner';
export const ROLE_ADVOGADO_ID = 'role-advogado';
export const ROLE_ASSISTENTE_ID = 'role-assistente';

export interface MockRole {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  ehSistema: boolean;
}

const SYSTEM_ROLES: MockRole[] = [
  { id: ROLE_OWNER_ID, nome: 'OWNER', descricao: 'Acesso total', nivel: 100, ehSistema: true },
  { id: ROLE_ADVOGADO_ID, nome: 'ADVOGADO', descricao: 'Advogado', nivel: 50, ehSistema: true },
  { id: ROLE_ASSISTENTE_ID, nome: 'ASSISTENTE', descricao: 'Assistente', nivel: 10, ehSistema: true },
];

/**
 * Mutável e exportado (Permission Engine, Prompt 12) — `mocks/handlers/
 * permissions.ts` cria/edita/exclui perfis customizados aqui mesmo, para
 * `GET /roles` (`RoleSelect`, `RolePermissionsPanel`) sempre refletir o
 * estado real entre os dois arquivos de handler, sem duas fontes de verdade.
 */
export let roles = [...SYSTEM_ROLES];

// Bindings importadas são somente-leitura para quem importa — mutators
// exportados são a forma correta de outro arquivo de handler (`permissions.ts`)
// alterar este array sem duas fontes de verdade.
export function addRole(role: (typeof roles)[number]) {
  roles = [...roles, role];
}
export function updateRoleFields(id: string, patch: { nome?: string; descricao?: string }) {
  roles = roles.map((r) => (r.id === id ? { ...r, ...patch } : r));
}
export function removeRole(id: string) {
  roles = roles.filter((r) => r.id !== id);
}

export let members = [
  {
    id: 'mock-membro-1',
    usuario: { nome: 'Usuária', email: 'usuaria@quilombo.dev', avatarUrl: null },
    papel: 'OWNER',
    status: 'ATIVO' as const,
    entrouEm: '2026-01-10T12:00:00.000Z',
  },
  {
    id: 'member-2',
    usuario: { nome: 'Bruno Advogado', email: 'bruno@quilombo.dev', avatarUrl: null },
    papel: 'ADVOGADO',
    status: 'ATIVO' as const,
    entrouEm: '2026-02-01T12:00:00.000Z',
  },
  {
    id: 'member-3',
    usuario: { nome: 'Carla Assistente', email: 'carla@quilombo.dev', avatarUrl: null },
    papel: 'ASSISTENTE',
    status: 'INATIVO' as const,
    entrouEm: '2026-02-15T12:00:00.000Z',
  },
];

let invitations = [
  {
    id: 'invite-1',
    email: 'convidado@quilombo.dev',
    status: 'PENDENTE' as const,
    expiraEm: '2026-12-31T00:00:00.000Z',
    criadoEm: '2026-07-01T00:00:00.000Z',
    papelId: ROLE_ADVOGADO_ID,
  },
];

// ---------------------------------------------------------------------
// Colaboradores (Sprint "Colaboradores") — dataset independente de
// `members` acima (legacy, usado por `useMembers()`/`MembersTable`, nunca
// alterado nesta Sprint). `GET /members` passa a responder com o shape
// paginado (`{items, nextCursor, total}`) quando a query string tem
// qualquer um dos parâmetros novos (`sort`/`situacao`/`acesso`/`cursor`/
// `limit`, sempre presentes em `useCollaborators`); sem eles, continua
// devolvendo o array plano legado — `teamApi.listMembers()` nunca envia
// esses parâmetros, então `useMembers()` não muda de comportamento.
// ---------------------------------------------------------------------
interface MockCollaboratorAddress {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
}

interface MockCollaborator {
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
  endereco: MockCollaboratorAddress;
  departamento: string | null;
  numeroOab: string | null;
  ufOab: string | null;
  situacaoOab: string | null;
  observacaoOab: string | null;
  dataEntrada: string | null;
  responsavel: { id: string; nome: string } | null;
  entrouEm: string | null;
}

const EMPTY_ADDRESS: MockCollaboratorAddress = {
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  pais: null,
};

function initialCollaborators(): MockCollaborator[] {
  return [
    {
      id: 'collab-ana',
      nome: 'Ana Beatriz Souza',
      nomeSocial: null,
      fotoUrl: null,
      cpf: '52998224725',
      email: 'ana.souza@quilombo.dev',
      telefone: null,
      celular: '11988880001',
      whatsapp: '11988880001',
      dataNascimento: '1985-04-10',
      cargo: { id: MOCK_CARGO_ADVOGADO_SENIOR_ID, nome: 'Advogado Sênior' },
      grupos: [],
      papel: { id: ROLE_OWNER_ID, nome: 'OWNER' },
      temAcesso: true,
      situacaoAcesso: 'DESBLOQUEADO',
      status: 'ATIVO',
      criadoEm: '2025-01-10T12:00:00.000Z',
      atualizadoEm: '2025-01-10T12:00:00.000Z',
      rg: null,
      estadoCivil: null,
      profissao: null,
      nomeMae: null,
      nomePai: null,
      anotacoes: null,
      endereco: EMPTY_ADDRESS,
      departamento: null,
      numeroOab: '123456',
      ufOab: 'SP',
      situacaoOab: 'REGULAR',
      observacaoOab: null,
      dataEntrada: '2025-01-10',
      responsavel: null,
      entrouEm: '2025-01-10T12:00:00.000Z',
    },
    {
      id: 'collab-bruno',
      nome: 'Bruno Lima Costa',
      nomeSocial: null,
      fotoUrl: null,
      cpf: null,
      email: 'bruno.costa@quilombo.dev',
      telefone: null,
      celular: null,
      whatsapp: null,
      dataNascimento: '1990-08-22',
      cargo: { id: MOCK_CARGO_ADVOGADO_ID, nome: 'Advogado' },
      grupos: [],
      papel: { id: ROLE_ADVOGADO_ID, nome: 'ADVOGADO' },
      temAcesso: true,
      situacaoAcesso: 'BLOQUEADO',
      status: 'ATIVO',
      criadoEm: '2025-02-01T12:00:00.000Z',
      atualizadoEm: '2025-02-01T12:00:00.000Z',
      rg: null,
      estadoCivil: null,
      profissao: null,
      nomeMae: null,
      nomePai: null,
      anotacoes: null,
      endereco: EMPTY_ADDRESS,
      departamento: null,
      numeroOab: null,
      ufOab: null,
      situacaoOab: null,
      observacaoOab: null,
      dataEntrada: '2025-02-01',
      responsavel: null,
      entrouEm: '2025-02-01T12:00:00.000Z',
    },
    {
      id: 'collab-carla',
      nome: 'Carla Nogueira',
      nomeSocial: null,
      fotoUrl: null,
      cpf: null,
      email: 'carla.nogueira@quilombo.dev',
      telefone: null,
      celular: null,
      whatsapp: null,
      dataNascimento: '1992-11-05',
      cargo: { id: MOCK_CARGO_ANALISTA_ADM_ID, nome: 'Analista Administrativo' },
      grupos: [],
      papel: { id: ROLE_ASSISTENTE_ID, nome: 'ASSISTENTE' },
      temAcesso: true,
      situacaoAcesso: 'SUSPENSO',
      status: 'ATIVO',
      criadoEm: '2025-03-01T12:00:00.000Z',
      atualizadoEm: '2025-03-01T12:00:00.000Z',
      rg: null,
      estadoCivil: null,
      profissao: null,
      nomeMae: null,
      nomePai: null,
      anotacoes: null,
      endereco: EMPTY_ADDRESS,
      departamento: 'Administrativo',
      numeroOab: null,
      ufOab: null,
      situacaoOab: null,
      observacaoOab: null,
      dataEntrada: '2025-03-01',
      responsavel: null,
      entrouEm: '2025-03-01T12:00:00.000Z',
    },
    {
      id: 'collab-diego',
      nome: 'Diego Fernandes',
      nomeSocial: null,
      fotoUrl: null,
      cpf: null,
      email: 'diego.fernandes@exemplo.com',
      telefone: null,
      celular: null,
      whatsapp: null,
      dataNascimento: '1998-01-15',
      cargo: { id: MOCK_CARGO_ESTAGIARIO_ID, nome: 'Estagiário' },
      grupos: [],
      papel: { id: ROLE_ADVOGADO_ID, nome: 'ADVOGADO' },
      temAcesso: true,
      situacaoAcesso: 'CONVITE_PENDENTE',
      status: 'ATIVO',
      criadoEm: '2026-07-20T09:00:00.000Z',
      atualizadoEm: '2026-07-20T09:00:00.000Z',
      rg: null,
      estadoCivil: null,
      profissao: null,
      nomeMae: null,
      nomePai: null,
      anotacoes: null,
      endereco: EMPTY_ADDRESS,
      departamento: null,
      numeroOab: null,
      ufOab: null,
      situacaoOab: null,
      observacaoOab: null,
      dataEntrada: '2026-07-20',
      responsavel: null,
      entrouEm: null,
    },
    {
      id: 'collab-elisa',
      nome: 'Elisa Martins',
      nomeSocial: null,
      fotoUrl: null,
      cpf: null,
      email: 'elisa.martins@quilombo.dev',
      telefone: null,
      celular: null,
      whatsapp: null,
      dataNascimento: '2001-06-30',
      cargo: { id: MOCK_CARGO_ESTAGIARIO_ID, nome: 'Estagiário' },
      grupos: [],
      papel: null,
      temAcesso: false,
      situacaoAcesso: 'SEM_ACESSO',
      status: 'ATIVO',
      criadoEm: '2026-06-01T09:00:00.000Z',
      atualizadoEm: '2026-06-01T09:00:00.000Z',
      rg: null,
      estadoCivil: null,
      profissao: null,
      nomeMae: null,
      nomePai: null,
      anotacoes: null,
      endereco: EMPTY_ADDRESS,
      departamento: null,
      numeroOab: null,
      ufOab: null,
      situacaoOab: null,
      observacaoOab: null,
      dataEntrada: null,
      responsavel: null,
      entrouEm: null,
    },
  ];
}

export let collaborators: MockCollaborator[] = initialCollaborators();

let nextCollaboratorId = 1;

function toListItem(c: MockCollaborator) {
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

const SITUACAO_FILTER_MAP: Record<string, string> = {
  desbloqueado: 'DESBLOQUEADO',
  bloqueado: 'BLOQUEADO',
  suspenso: 'SUSPENSO',
  convite_pendente: 'CONVITE_PENDENTE',
  inativo: 'INATIVO',
};

function filterCollaborators(url: URL): MockCollaborator[] {
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

  return collaborators.filter((c) => {
    if (q && !(c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.cpf ?? '').includes(q))) {
      return false;
    }
    if (nome && !c.nome.toLowerCase().includes(nome)) return false;
    if (cpf && !(c.cpf ?? '').includes(cpf)) return false;
    if (email && !c.email.toLowerCase().includes(email)) return false;
    if (telefone && !(c.telefone ?? '').includes(telefone) && !(c.celular ?? '').includes(telefone)) return false;
    if (grupoId && !c.grupos.some((g) => g.id === grupoId)) return false;
    if (cargoId && c.cargo?.id !== cargoId) return false;
    if (acesso === 'com_acesso' && !c.temAcesso) return false;
    if (acesso === 'sem_acesso' && c.temAcesso) return false;
    if (situacao && situacao !== 'todos' && c.situacaoAcesso !== SITUACAO_FILTER_MAP[situacao]) return false;
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

function sortCollaborators(items: MockCollaborator[], sort: string | null): MockCollaborator[] {
  const sorted = [...items];
  const cmp = {
    nome_asc: (a: MockCollaborator, b: MockCollaborator) => a.nome.localeCompare(b.nome),
    nome_desc: (a: MockCollaborator, b: MockCollaborator) => b.nome.localeCompare(a.nome),
    cargo_asc: (a: MockCollaborator, b: MockCollaborator) => (a.cargo?.nome ?? '').localeCompare(b.cargo?.nome ?? ''),
    cargo_desc: (a: MockCollaborator, b: MockCollaborator) => (b.cargo?.nome ?? '').localeCompare(a.cargo?.nome ?? ''),
    nascimento_asc: (a: MockCollaborator, b: MockCollaborator) => (a.dataNascimento ?? '').localeCompare(b.dataNascimento ?? ''),
    nascimento_desc: (a: MockCollaborator, b: MockCollaborator) => (b.dataNascimento ?? '').localeCompare(a.dataNascimento ?? ''),
    cadastro_asc: (a: MockCollaborator, b: MockCollaborator) => a.criadoEm.localeCompare(b.criadoEm),
    cadastro_desc: (a: MockCollaborator, b: MockCollaborator) => b.criadoEm.localeCompare(a.criadoEm),
    alteracao_asc: (a: MockCollaborator, b: MockCollaborator) => a.atualizadoEm.localeCompare(b.atualizadoEm),
    alteracao_desc: (a: MockCollaborator, b: MockCollaborator) => b.atualizadoEm.localeCompare(a.atualizadoEm),
  }[sort ?? 'nome_asc'];
  return cmp ? sorted.sort(cmp) : sorted;
}

/** Marcador de presença — qualquer um destes indica "chamada nova" (`useCollaborators`), nunca enviados por `teamApi.listMembers()`. */
const COLLABORATOR_QUERY_MARKERS = ['sort', 'situacao', 'acesso', 'cursor', 'limit', 'grupoId', 'cargoId'];

export function resetTeamMocks() {
  roles = [...SYSTEM_ROLES];
  members = [
    {
      id: 'mock-membro-1',
      usuario: { nome: 'Usuária', email: 'usuaria@quilombo.dev', avatarUrl: null },
      papel: 'OWNER',
      status: 'ATIVO',
      entrouEm: '2026-01-10T12:00:00.000Z',
    },
    {
      id: 'member-2',
      usuario: { nome: 'Bruno Advogado', email: 'bruno@quilombo.dev', avatarUrl: null },
      papel: 'ADVOGADO',
      status: 'ATIVO',
      entrouEm: '2026-02-01T12:00:00.000Z',
    },
    {
      id: 'member-3',
      usuario: { nome: 'Carla Assistente', email: 'carla@quilombo.dev', avatarUrl: null },
      papel: 'ASSISTENTE',
      status: 'INATIVO',
      entrouEm: '2026-02-15T12:00:00.000Z',
    },
  ];
  invitations = [
    {
      id: 'invite-1',
      email: 'convidado@quilombo.dev',
      status: 'PENDENTE',
      expiraEm: '2026-12-31T00:00:00.000Z',
      criadoEm: '2026-07-01T00:00:00.000Z',
      papelId: ROLE_ADVOGADO_ID,
    },
  ];
  collaborators = initialCollaborators();
  nextCollaboratorId = 1;
}

export const teamHandlers = [
  http.get(`${base}/members`, ({ request }) => {
    const url = new URL(request.url);
    const isCollaboratorsQuery = COLLABORATOR_QUERY_MARKERS.some((key) => url.searchParams.has(key));
    if (!isCollaboratorsQuery) return HttpResponse.json(members);

    const filtered = filterCollaborators(url);
    const sorted = sortCollaborators(filtered, url.searchParams.get('sort'));
    const limit = Number(url.searchParams.get('limit') ?? 20) || 20;
    const cursor = url.searchParams.get('cursor');
    const startIndex = cursor ? sorted.findIndex((c) => c.id === cursor) + 1 : 0;
    const page = sorted.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < sorted.length ? page[page.length - 1]?.id ?? null : null;

    return HttpResponse.json({ items: page.map(toListItem), nextCursor, total: sorted.length });
  }),

  http.get(`${base}/members/:id`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
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
      endereco?: Partial<MockCollaboratorAddress>;
    };
    const id = `collab-mock-${nextCollaboratorId++}`;
    const cargo = body.cargoId ? (MOCK_CARGOS.find((c) => c.id === body.cargoId) ?? null) : null;
    const papel = body.comAcesso ? roles.find((r) => r.id === body.papelId) ?? null : null;
    const now = new Date().toISOString();
    const created: MockCollaborator = {
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
      cargo,
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
      endereco: { ...EMPTY_ADDRESS, ...(body.endereco ?? {}) },
      departamento: (body.departamento as string) || null,
      numeroOab: (body.numeroOab as string) || null,
      ufOab: (body.ufOab as string) || null,
      situacaoOab: (body.situacaoOab as string) || null,
      observacaoOab: (body.observacaoOab as string) || null,
      dataEntrada: (body.dataEntrada as string) || null,
      responsavel: null,
      entrouEm: null,
    };
    collaborators = [created, ...collaborators];
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/members/:id`, async ({ params, request }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    const body = (await request.json()) as Record<string, unknown>;
    const { grupoIds: _grupoIds, endereco, cargoId, ...rest } = body;
    void _grupoIds;
    Object.assign(collaborator, rest);
    if (endereco) collaborator.endereco = { ...collaborator.endereco, ...(endereco as object) };
    // `collaborator.cargo` é `{id, nome}` (mesma forma de `CollaboratorDetailDTO`/
    // `toListItem`) — PATCH recebe `cargoId` (string), nunca o objeto pronto,
    // então precisa resolver contra o catálogo mockado antes de gravar; um
    // `Object.assign` genérico deixaria um `cargoId` solto no mock sem nunca
    // atualizar `cargo`, e a listagem/GET continuariam mostrando o cargo antigo.
    if ('cargoId' in body) {
      collaborator.cargo = cargoId ? (MOCK_CARGOS.find((c) => c.id === cargoId) ?? null) : null;
    }
    collaborator.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/block`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.situacaoAcesso = 'BLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/unblock`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.situacaoAcesso = 'DESBLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/suspend`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.situacaoAcesso = 'SUSPENSO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/unsuspend`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.situacaoAcesso = 'DESBLOQUEADO';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/grant-access`, async ({ params, request }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    const body = (await request.json()) as { email?: string; papelId: string };
    const role = roles.find((r) => r.id === body.papelId);
    if (!role) return problem(422, 'MALFORMED_REQUEST', 'Papel inválido.');
    if (body.email) collaborator.email = body.email;
    collaborator.papel = { id: role.id, nome: role.nome };
    collaborator.temAcesso = true;
    collaborator.situacaoAcesso = 'CONVITE_PENDENTE';
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/members/:id/revoke-access`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    collaborator.temAcesso = false;
    collaborator.situacaoAcesso = 'SEM_ACESSO';
    collaborator.papel = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/members/:id/sessions`, ({ params }) => {
    const collaborator = collaborators.find((c) => c.id === params.id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Colaborador não encontrado.');
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/members/:id/role`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { papelId?: string };

    if (id === 'member-self') {
      return problem(403, 'SELF_ESCALATION_FORBIDDEN', 'Você não pode alterar o próprio papel.');
    }

    const member = members.find((m) => m.id === id);
    if (!member) return problem(404, 'NOT_FOUND', 'Membro não encontrado.');

    if (member.papel === 'OWNER') {
      const otherActiveOwners = members.filter(
        (m) => m.papel === 'OWNER' && m.status === 'ATIVO' && m.id !== id,
      );
      if (otherActiveOwners.length === 0) {
        return problem(409, 'LAST_OWNER', 'O escritório precisa de ao menos um Owner ativo.');
      }
    }

    const role = roles.find((r) => r.id === body.papelId);
    member.papel = role?.nome ?? member.papel;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/members/:id`, ({ params }) => {
    const { id } = params;
    const member = members.find((m) => m.id === id);
    if (member) {
      if (member.papel === 'OWNER') {
        const otherActiveOwners = members.filter(
          (m) => m.papel === 'OWNER' && m.status === 'ATIVO' && m.id !== id,
        );
        if (otherActiveOwners.length === 0) {
          return problem(409, 'LAST_OWNER', 'O escritório precisa de ao menos um Owner ativo.');
        }
      }
      member.status = 'INATIVO';
      return HttpResponse.json({ desativado: true });
    }

    // `teamApi.removeMember` (existente) é reaproveitado pela ação
    // "Remover colaborador" da nova listagem — o `id` ali é o de
    // `collaborators` (dataset novo, espaço de IDs distinto de `members`).
    const collaborator = collaborators.find((c) => c.id === id);
    if (!collaborator) return problem(404, 'NOT_FOUND', 'Membro não encontrado.');
    // `status: 'INATIVO'` tem prioridade sobre qualquer situação de acesso
    // (mesma regra de `computeSituacaoAcesso` no backend real, ver
    // `collaborator-status.util.ts`) — soft-delete: o colaborador nunca é
    // removido do catálogo, e a consulta "Todos" (sem filtro de situação)
    // continua trazendo-o, agora com o badge "Inativo".
    collaborator.status = 'INATIVO';
    collaborator.situacaoAcesso = 'INATIVO';
    collaborator.atualizadoEm = new Date().toISOString();
    return HttpResponse.json({ desativado: true });
  }),

  http.post(`${base}/invitations`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; papelId?: string };
    if (body.email === 'bloqueado@quilombo.dev') {
      return problem(422, 'MALFORMED_REQUEST', 'Não foi possível enviar o convite.', [
        { field: 'email', code: 'blocked', message: 'Este e-mail não pode ser convidado.' },
      ]);
    }
    const invitation = {
      id: `invite-${invitations.length + 1}`,
      email: body.email ?? '',
      status: 'PENDENTE' as const,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      criadoEm: new Date().toISOString(),
      papelId: body.papelId ?? ROLE_ADVOGADO_ID,
    };
    invitations = [invitation, ...invitations];
    return HttpResponse.json(invitation, { status: 201 });
  }),

  http.get(`${base}/invitations`, () => HttpResponse.json(invitations)),

  http.post(`${base}/invitations/:id/resend`, ({ params }) => {
    const invitation = invitations.find((i) => i.id === params.id);
    if (!invitation) return problem(404, 'NOT_FOUND', 'Convite não encontrado ou não está pendente.');
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/invitations/:id`, ({ params }) => {
    const invitation = invitations.find((i) => i.id === params.id);
    if (!invitation) return problem(404, 'NOT_FOUND', 'Convite não encontrado.');
    invitations = invitations.filter((i) => i.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/invitations/:token/accept`, async ({ params, request }) => {
    const { token } = params;
    if (token === 'token-invalido' || token === 'token-expirado') {
      return problem(404, 'NOT_FOUND', 'Convite inválido ou expirado.');
    }
    if (token === 'token-ja-aceito') {
      return HttpResponse.json({ membroId: 'membro-existente' });
    }
    const body = (await request.json()) as { nome?: string; sobrenome?: string; senha?: string };
    if (token === 'token-novo-usuario' && (!body.nome || !body.sobrenome || !body.senha)) {
      return problem(422, 'MALFORMED_REQUEST', 'Informe nome, sobrenome e senha para criar sua conta.');
    }
    return HttpResponse.json({ membroId: 'novo-membro' });
  }),

  http.get(`${base}/roles`, () => HttpResponse.json(roles)),
];
