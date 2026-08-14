import type { CollaboratorFiltersInput } from './collaborators.api';

/**
 * Reafirma docs/frontend/10-tanstack-query.md §10.2 — toda chave prefixada
 * por `['office', officeId, ...]`, sem exceção (Team é a primeira feature
 * de domínio a seguir a convenção à risca, diferente de `authKeys.me()`).
 */
export const teamKeys = {
  all: (officeId: string) => ['office', officeId, 'team'] as const,
  members: (officeId: string) => [...teamKeys.all(officeId), 'members'] as const,
  invitations: (officeId: string) => [...teamKeys.all(officeId), 'invitations'] as const,
  roles: (officeId: string) => [...teamKeys.all(officeId), 'roles'] as const,
  // Colaboradores (Sprint "Colaboradores") — prefixo próprio para permitir
  // invalidar toda a listagem (qualquer combinação de filtros) de uma vez,
  // mesmo padrão de `clientsKeys.lists`/`clientsKeys.list`.
  collaboratorsAll: (officeId: string) => [...teamKeys.all(officeId), 'collaborators'] as const,
  collaborators: (officeId: string, filters: CollaboratorFiltersInput) =>
    [...teamKeys.collaboratorsAll(officeId), 'list', filters] as const,
  collaboratorDetails: (officeId: string) => [...teamKeys.collaboratorsAll(officeId), 'detail'] as const,
  collaborator: (officeId: string, id: string) => [...teamKeys.collaboratorDetails(officeId), id] as const,
};
