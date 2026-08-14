import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from '@/stores/office.store';
import { useSwitchOffice } from './mutations';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/**
 * Reafirma docs/frontend/07-office-context.md §7.3/§7.4 — `queryClient.clear()`
 * inteiro no sucesso, sem tocar em nada no caso de falha 403 (handler MSW
 * em mocks/handlers/identity.ts falha para `escritorioId: 'mock-office-revogado'`).
 */
describe('useSwitchOffice', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('sucesso: limpa o queryClient inteiro e atualiza o escritório ativo no store', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['office', 'office-1', 'legal-cases'], ['dado-do-escritorio-anterior']);
    useOfficeStore.getState().hydrateFromLogin('office-1', [
      { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
      { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
    ]);

    const { result } = renderHook(() => useSwitchOffice(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ escritorioId: 'office-2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useOfficeStore.getState().escritorioAtivoId).toBe('office-2');
  });

  it('falha 403 (vínculo removido): remove o escritório da lista local, não mexe no cache nem no ativo', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['office', 'office-1', 'legal-cases'], ['dado-preservado']);
    useOfficeStore.getState().hydrateFromLogin('office-1', [
      { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
      { id: 'mock-office-revogado', nome: 'Escritório Revogado', papel: 'ADVOGADO' },
    ]);

    const { result } = renderHook(() => useSwitchOffice(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ escritorioId: 'mock-office-revogado' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    expect(useOfficeStore.getState().escritorioAtivoId).toBe('office-1');
    expect(useOfficeStore.getState().escritorios.map((o) => o.id)).toEqual(['office-1']);
  });
});
