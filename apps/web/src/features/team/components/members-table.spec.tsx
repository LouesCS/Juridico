import * as React from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor as waitForHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { MembersTable } from './members-table';
import { useRemoveMember } from '../api/mutations';

const base = env.NEXT_PUBLIC_API_URL;

describe('MembersTable', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista os membros reais de GET /members', async () => {
    renderWithProviders(<MembersTable />);

    expect(await screen.findByText('Bruno Advogado')).toBeInTheDocument();
    expect(screen.getByText('Carla Assistente')).toBeInTheDocument();
    expect(screen.getAllByText(/OWNER|ADVOGADO|ASSISTENTE/).length).toBeGreaterThan(0);
  });

  it('altera o papel de um membro com sucesso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersTable />);

    await screen.findByText('Bruno Advogado');
    const row = screen.getByText('Bruno Advogado').closest('tr')!;
    await user.click(within(row).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'ASSISTENTE' }));

    await waitFor(() => expect(within(row).getByRole('combobox')).toHaveTextContent('ASSISTENTE'));
  });

  it('protege o último OWNER ativo: remoção fica desabilitada', async () => {
    renderWithProviders(<MembersTable />);

    const ownerRow = (await screen.findByText('Usuária')).closest('tr')!;
    const removeButton = within(ownerRow).getByRole('button', { name: /Remover/ });
    expect(removeButton).toBeDisabled();
  });

  it('tentativa de remover último OWNER retorna 409 LAST_OWNER e a mutation reporta erro', async () => {
    // A UI já desabilita o botão para o próprio último Owner (teste
    // anterior) — este teste cobre o hook em si contra o handler MSW real
    // de `DELETE /members/:id`, que aplica a mesma regra do backend real
    // (`RemoveMemberUseCase`).
    function Wrapper({ children }: { children: React.ReactNode }) {
      const [client] = React.useState(
        () => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
      );
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useRemoveMember(), { wrapper: Wrapper });
    result.current.mutate('mock-membro-1');

    await waitForHook(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as { code?: string })?.code).toBe('LAST_OWNER');
  });

  it('usuário sem member:update-role/member:remove: controles de edição não aparecem', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ASSISTENTE', permissions: ['office:read', 'member:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<MembersTable />);

    await screen.findByText('Bruno Advogado');
    expect(screen.queryByRole('combobox', { name: /^Papel de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
  });
});
