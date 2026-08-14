import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from '@/stores/office.store';
import { OfficeProvider } from './office-provider';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/**
 * Reafirma docs/frontend/07-office-context.md §7.1 (sincroniza com `GET
 * /me`) e §7.3 passo (e) (escuta troca de escritório de outra aba via
 * `BroadcastChannel`, executa (a)-(d), nunca (f) — não navega).
 */
describe('OfficeProvider', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('sincroniza o store com o escritório ativo de GET /me ao montar', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <OfficeProvider>conteúdo</OfficeProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(useOfficeStore.getState().status).toBe('ready'));
    expect(useOfficeStore.getState().escritorioAtivoId).toBe('mock-office-1');
  });

  it('ao receber office-switched de outra aba, limpa o cache e atualiza o store sem navegar', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['office', 'mock-office-1', 'legal-cases'], ['dado-antigo']);

    render(
      <QueryClientProvider client={queryClient}>
        <OfficeProvider>conteúdo</OfficeProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(useOfficeStore.getState().status).toBe('ready'));

    const otherTabChannel = new BroadcastChannel('quilombo-office');
    otherTabChannel.postMessage({ type: 'office-switched', escritorioId: 'office-2' });
    otherTabChannel.close();

    await waitFor(() => expect(useOfficeStore.getState().escritorioAtivoId).toBe('office-2'));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
