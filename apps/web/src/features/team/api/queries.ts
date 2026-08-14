'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { teamApi } from './team.api';
import { collaboratorsApi, type CollaboratorFiltersInput } from './collaborators.api';
import { teamKeys } from './keys';

/**
 * `enabled: !!officeId` — evita disparar antes do Office Context resolver
 * o escritório ativo (§7.1); nenhuma destas queries faz sentido sem um
 * `officeId` real na chave.
 */
export function useMembers() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: teamKeys.members(escritorioAtivoId ?? ''),
    queryFn: teamApi.listMembers,
    enabled: !!escritorioAtivoId,
  });
}

export function useInvitations() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: teamKeys.invitations(escritorioAtivoId ?? ''),
    queryFn: teamApi.listInvitations,
    enabled: !!escritorioAtivoId,
  });
}

export function useRoles() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: teamKeys.roles(escritorioAtivoId ?? ''),
    queryFn: teamApi.listRoles,
    enabled: !!escritorioAtivoId,
    staleTime: 5 * 60_000,
  });
}

/**
 * `GET /members` com filtros — endpoint "Colaboradores" (Sprint
 * "Colaboradores"), distinto de `useMembers()` acima (que continua sem
 * filtros, consumido por seletores de outras features). `placeholderData`
 * (mesmo padrão de `useClients`) evita o flash de loading ao trocar de
 * página/filtro.
 */
export function useCollaborators(filters: CollaboratorFiltersInput = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: teamKeys.collaborators(escritorioAtivoId ?? '', filters),
    queryFn: () => collaboratorsApi.list(filters),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}

export function useCollaborator(id: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: teamKeys.collaborator(escritorioAtivoId ?? '', id),
    queryFn: () => collaboratorsApi.get(id),
    enabled: !!escritorioAtivoId && !!id,
  });
}
