'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type ChangePasswordInput } from './profile.api';
import { profileKeys } from './keys';

/**
 * Reafirma `change-password.use-case.ts` real — trocar a senha revoga
 * todas as demais sessões no backend; a lista local é invalidada para
 * refletir isso (a sessão atual continua ativa, as outras já não
 * existem mais no servidor no próximo fetch).
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => profileApi.changePassword(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions() });
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => profileApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions() });
    },
  });
}
