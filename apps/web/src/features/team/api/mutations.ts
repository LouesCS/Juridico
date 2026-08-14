'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { teamApi, type InviteMemberInput, type AcceptInvitationInput } from './team.api';
import {
  collaboratorsApi,
  type CreateCollaboratorInput,
  type GrantAccessInput,
  type UpdateCollaboratorInput,
} from './collaborators.api';
import { teamKeys } from './keys';

/**
 * Reafirma docs/frontend/10-tanstack-query.md §10.3 — invalidação
 * explícita por recurso, nunca "invalida tudo" como atalho.
 */
export function useInviteMember() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => teamApi.inviteMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(escritorioAtivoId ?? '') });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ memberId, papelId }: { memberId: string; papelId: string }) =>
      teamApi.updateMemberRole(memberId, papelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(escritorioAtivoId ?? '') });
    },
  });
}

/**
 * Reaproveitada pela ação "Remover colaborador" da nova listagem além do
 * fluxo legado de `members-table.tsx` — precisa invalidar AMBOS os espaços de
 * consulta (`members` e `collaboratorsAll`), já que o mesmo endpoint
 * (`DELETE /members/:id`) é chamado a partir de qualquer uma das duas telas.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  const officeId = escritorioAtivoId ?? '';
  return useMutation({
    mutationFn: (memberId: string) => teamApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(officeId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.collaboratorsAll(officeId) });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (invitationId: string) => teamApi.resendInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(escritorioAtivoId ?? '') });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (invitationId: string) => teamApi.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(escritorioAtivoId ?? '') });
    },
  });
}

/**
 * Usado pela rota pública `/convite/[token]` — sem escritório ativo
 * (o próprio aceite é o que cria o vínculo), por isso não invalida
 * nenhuma chave escopada por `officeId`.
 */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, input }: { token: string; input: AcceptInvitationInput }) =>
      teamApi.acceptInvitation(token, input),
  });
}

// ---------------------------------------------------------------------
// Colaboradores (Sprint "Colaboradores") — invalida sempre a listagem
// (`collaboratorsAll`, qualquer combinação de filtros) + o detalhe pontual
// quando o `id` já é conhecido no momento da chamada, mesmo racional de
// `features/clients/api/mutations.ts`.
// ---------------------------------------------------------------------
function useInvalidateCollaborators() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  const officeId = escritorioAtivoId ?? '';
  return {
    all: () => queryClient.invalidateQueries({ queryKey: teamKeys.collaboratorsAll(officeId) }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: teamKeys.collaborator(officeId, id) }),
    // Membros de outras features (seletor de Responsável, Grupos de
    // Colaboradores) ainda leem `useMembers()` — mantido em sincronia.
    members: () => queryClient.invalidateQueries({ queryKey: teamKeys.members(officeId) }),
  };
}

export function useCreateCollaborator() {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: (input: CreateCollaboratorInput) => collaboratorsApi.create(input),
    onSuccess: () => {
      invalidate.all();
      invalidate.members();
    },
  });
}

export function useUpdateCollaborator(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: (input: UpdateCollaboratorInput) => collaboratorsApi.update(id, input),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
      invalidate.members();
    },
  });
}

export function useBlockMember(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.block(id),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
    },
  });
}

export function useUnblockMember(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.unblock(id),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
    },
  });
}

export function useSuspendMember(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.suspend(id),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
    },
  });
}

export function useUnsuspendMember(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.unsuspend(id),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
    },
  });
}

export function useGrantAccess(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: (input: GrantAccessInput) => collaboratorsApi.grantAccess(id, input),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
      invalidate.members();
    },
  });
}

export function useRevokeAccess(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.revokeAccess(id),
    onSuccess: () => {
      invalidate.all();
      invalidate.detail(id);
      invalidate.members();
    },
  });
}

export function useRevokeAllSessions(id: string) {
  const invalidate = useInvalidateCollaborators();
  return useMutation({
    mutationFn: () => collaboratorsApi.revokeAllSessions(id),
    onSuccess: () => {
      invalidate.detail(id);
    },
  });
}
