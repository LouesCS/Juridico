'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfficeStore } from '@/stores/office.store';
import { authApi } from './auth.api';
import { authKeys } from './keys';

/**
 * Reafirma docs/frontend/05-autenticacao.md §5.4 — cada mutation só faz o
 * que a arquitetura já decidiu (invalidar `['me']`, nunca logar
 * automaticamente após registro/reset). Redirecionamento e
 * `queryClient.clear()` completo (logout) ficam a cargo do componente
 * chamador, que tem o `router` — mantém este módulo livre de import de
 * `next/navigation` (regra de fronteira lib/api não depende de app router).
 *
 * `hydrateFromLogin` no sucesso: `POST /auth/login` é o **único** endpoint
 * que retorna a lista completa de escritórios do usuário (`escritorios[]`)
 * — `GET /me` só devolve o escritório ativo (ver
 * docs/frontend-implementation/19-decisions.md §19.8). Sem isto, o
 * `WorkspaceSwitcher` nunca veria mais de um escritório mesmo quando o
 * usuário pertence a vários.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const hydrateFromLogin = useOfficeStore((s) => s.hydrateFromLogin);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      hydrateFromLogin(
        data.escritorioAtivoId,
        data.escritorios.map((e) => ({ id: e.id, nome: e.nome, papel: e.papel })),
      );
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetOffice = useOfficeStore((s) => s.reset);
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      resetOffice();
    },
  });
}

export function useRequestPasswordRecovery() {
  return useMutation({
    mutationFn: (email: string) => authApi.requestPasswordRecovery(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; novaSenha: string }) => authApi.resetPassword(input),
  });
}
