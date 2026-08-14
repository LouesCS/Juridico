import { apiClient } from '@/lib/api/client';
import type { RoleDTO } from '@/features/team';

/**
 * Tipos manuais espelhando `apps/api/src/modules/permissions/` (Permission
 * Engine, Prompt 12) — mesma pendência de `openapi-typescript` já
 * registrada em docs/frontend-implementation/19-decisions.md §19.2.
 * `RoleDTO` (lista simples) já existe em `features/team` (`GET /roles`,
 * módulo `MembershipsModule`) — reaproveitado aqui, nunca duplicado.
 */
export interface PermissionCatalogItem {
  id: string;
  chave: string;
  recurso: string;
  acao: string;
  escopo: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
  categoria: string;
  descricao: string;
}

export interface RoleDetailDTO extends RoleDTO {
  permissoes: string[];
}

export interface CreateRoleInput {
  nome: string;
  descricao?: string;
  permissoes: string[];
}

export const permissionsApi = {
  listCatalog: () => apiClient.get<PermissionCatalogItem[]>('/permissions'),

  getRole: (id: string) => apiClient.get<RoleDetailDTO>(`/roles/${id}`),

  createRole: (input: CreateRoleInput) => apiClient.post<{ id: string }>('/roles', input),

  updateRole: (id: string, input: { nome?: string; descricao?: string }) =>
    apiClient.patch<void>(`/roles/${id}`, input),

  updateRolePermissions: (id: string, permissoes: string[]) =>
    apiClient.patch<void>(`/roles/${id}/permissions`, { permissoes }),

  deleteRole: (id: string) => apiClient.delete<void>(`/roles/${id}`),
};
