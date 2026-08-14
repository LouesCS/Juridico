import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import { addRole, removeRole, ROLE_ADVOGADO_ID, ROLE_ASSISTENTE_ID, ROLE_OWNER_ID, roles, updateRoleFields } from './team';

/**
 * Handlers derivados do contrato real de
 * `apps/api/src/modules/permissions/` (Permission Engine, Prompt 12).
 * `GET /roles` continua em `team.ts` (não duplicado); este arquivo cobre
 * `GET /permissions` (catálogo) e o ciclo de vida de um papel individual.
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

const CATALOG = [
  { id: 'perm-office-read', chave: 'office:read', recurso: 'office', acao: 'read', escopo: 'ALL', categoria: 'Escritório', descricao: 'Visualizar dados do escritório' },
  { id: 'perm-member-read', chave: 'member:read', recurso: 'member', acao: 'read', escopo: 'ALL', categoria: 'Membros', descricao: 'Listar membros' },
  { id: 'perm-client-read', chave: 'client:read', recurso: 'client', acao: 'read', escopo: 'ALL', categoria: 'Clientes', descricao: 'Visualizar clientes' },
  { id: 'perm-client-read-sensitive', chave: 'client:read:sensitive', recurso: 'client', acao: 'read:sensitive', escopo: 'ALL', categoria: 'Clientes', descricao: 'Ver CPF/CNPJ e endereço completos' },
  { id: 'perm-case-read-all', chave: 'case:read:all', recurso: 'case', acao: 'read', escopo: 'ALL', categoria: 'Processos', descricao: 'Ver todos os processos' },
  { id: 'perm-case-delete', chave: 'case:delete', recurso: 'case', acao: 'delete', escopo: 'ALL', categoria: 'Processos', descricao: 'Excluir processo' },
  { id: 'perm-document-read-all', chave: 'document:read:all', recurso: 'document', acao: 'read', escopo: 'ALL', categoria: 'Documentos', descricao: 'Ver todos os documentos' },
  { id: 'perm-ai-summarize', chave: 'ai:summarize', recurso: 'ai', acao: 'summarize', escopo: 'ALL', categoria: 'IA', descricao: 'Gerar resumo por IA' },
  { id: 'perm-ai-usage-read', chave: 'ai:usage:read', recurso: 'ai', acao: 'usage:read', escopo: 'ALL', categoria: 'IA', descricao: 'Ver custo e uso de IA' },
  { id: 'perm-role-manage', chave: 'role:manage', recurso: 'role', acao: 'manage', escopo: 'ALL', categoria: 'Administração', descricao: 'Criar e editar perfis e permissões' },
  { id: 'perm-simulation-use', chave: 'simulation:use', recurso: 'simulation', acao: 'use', escopo: 'ALL', categoria: 'Administração', descricao: 'Simular a navegação de outro membro' },
  { id: 'perm-report-metrics', chave: 'report:metrics:read', recurso: 'report', acao: 'metrics:read', escopo: 'ALL', categoria: 'Relatórios', descricao: 'Ver indicadores do escritório' },
];

let rolePermissions: Record<string, string[]> = {
  [ROLE_OWNER_ID]: CATALOG.map((c) => c.chave),
  [ROLE_ADVOGADO_ID]: ['office:read', 'member:read', 'client:read', 'case:read:all', 'ai:summarize'],
  [ROLE_ASSISTENTE_ID]: ['office:read', 'client:read', 'document:read:all'],
};

export function resetPermissionsMocks() {
  rolePermissions = {
    [ROLE_OWNER_ID]: CATALOG.map((c) => c.chave),
    [ROLE_ADVOGADO_ID]: ['office:read', 'member:read', 'client:read', 'case:read:all', 'ai:summarize'],
    [ROLE_ASSISTENTE_ID]: ['office:read', 'client:read', 'document:read:all'],
  };
}

export const permissionsHandlers = [
  http.get(`${base}/permissions`, () => HttpResponse.json(CATALOG)),

  http.get(`${base}/roles/:id`, ({ params }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    return HttpResponse.json({ ...role, permissoes: rolePermissions[role.id] ?? [] });
  }),

  http.post(`${base}/roles`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; descricao?: string; permissoes: string[] };
    const id = `role-custom-${roles.length + 1}`;
    addRole({ id, nome: body.nome, descricao: body.descricao ?? null, nivel: 30, ehSistema: false });
    rolePermissions[id] = body.permissoes;
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch(`${base}/roles/:id`, async ({ params, request }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema) return problem(403, 'FORBIDDEN', 'Perfis de sistema não podem ser renomeados.');
    const body = (await request.json()) as { nome?: string; descricao?: string };
    updateRoleFields(role.id, body);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${base}/roles/:id/permissions`, async ({ params, request }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema) {
      return problem(403, 'FORBIDDEN', 'Perfis de sistema têm permissões fixas.');
    }
    const body = (await request.json()) as { permissoes: string[] };
    rolePermissions[role.id] = body.permissoes;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/roles/:id`, ({ params }) => {
    const role = roles.find((r) => r.id === params.id);
    if (!role) return problem(404, 'NOT_FOUND', 'Papel não encontrado.');
    if (role.ehSistema) return problem(403, 'FORBIDDEN', 'Perfis de sistema não podem ser excluídos.');
    if (role.id === 'role-em-uso') return problem(409, 'ROLE_IN_USE', 'Perfil atribuído a membros ativos.');
    removeRole(role.id);
    delete rolePermissions[role.id];
    return new HttpResponse(null, { status: 204 });
  }),
];
