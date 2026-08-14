import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api/errors';

/**
 * Configuração reafirma docs/frontend/10-tanstack-query.md §10.1 (idêntica
 * a docs/04-arquitetura-frontend.md §4.3, não redecidida aqui).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
