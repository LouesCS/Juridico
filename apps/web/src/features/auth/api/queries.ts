'use client';

import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/lib/api/errors';
import { authApi } from './auth.api';
import { authKeys } from './keys';

/**
 * Reafirma docs/frontend/05-autenticacao.md §5.3 — hidratado no Server
 * Component do layout autenticado (ainda não implementado nesta rodada,
 * ver docs/frontend-implementation/00-status.md); este hook é o que os
 * Client Components usam para ler o mesmo dado já em cache.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}
