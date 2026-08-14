'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { teamKeys } from '@/features/team/api/keys';
import { permissionsApi, type CreateRoleInput } from './permissions.api';
import { permissionsKeys } from './keys';

/**
 * `teamKeys.roles(officeId)` também é invalidada em toda mutation — a
 * lista simples de papéis (`GET /roles`, reaproveitada de `features/team`
 * via `useRoles`) alimenta `RoleSelect` (convite/troca de papel de
 * membro) e precisa refletir perfis customizados criados/editados/
 * excluídos aqui, sem duplicar o fetch.
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => permissionsApi.createRole(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.roles(escritorioAtivoId ?? '') });
    },
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: { nome?: string; descricao?: string }) => permissionsApi.updateRole(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.roles(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({ queryKey: permissionsKeys.role(escritorioAtivoId ?? '', id) });
    },
  });
}

export function useUpdateRolePermissions(id: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (permissoes: string[]) => permissionsApi.updateRolePermissions(id, permissoes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsKeys.role(escritorioAtivoId ?? '', id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (id: string) => permissionsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.roles(escritorioAtivoId ?? '') });
    },
  });
}
