import * as React from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { render } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { CollaboratorsPage } from './collaborators-page';

const base = env.NEXT_PUBLIC_API_URL;

function setOffice() {
  useOfficeStore.getState().reset();
  useOfficeStore
    .getState()
    .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
}

describe('CollaboratorsPage', () => {
  beforeEach(() => {
    setOffice();
  });

  it('lista os colaboradores reais de GET /members (shape paginado)', async () => {
    renderWithProviders(<CollaboratorsPage />);

    expect(await screen.findByText('Ana Beatriz Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Nogueira')).toBeInTheDocument();
    expect(screen.getByText('Diego Fernandes')).toBeInTheDocument();
    expect(screen.getByText('Elisa Martins')).toBeInTheDocument();
  });

  it('mostra o badge de acesso e a situação de cada colaborador', async () => {
    renderWithProviders(<CollaboratorsPage />);

    await screen.findByText('Ana Beatriz Souza');
    const elisaRow = screen.getByText('Elisa Martins').closest('tr')!;
    // "Sem acesso" aparece duas vezes na linha da Elisa: o badge da coluna
    // "Acesso" (`temAcesso: false`) e o badge da coluna "Situação"
    // (`situacaoAcesso: 'SEM_ACESSO'`) — duplicação intencional, cada coluna
    // com seu próprio significado.
    expect(within(elisaRow).getAllByText('Sem acesso').length).toBeGreaterThan(0);

    const brunoRow = screen.getByText('Bruno Lima Costa').closest('tr')!;
    expect(within(brunoRow).getByText('Bloqueado')).toBeInTheDocument();
  });

  it('filtra colaboradores pela busca geral (q)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorsPage />);

    await screen.findByText('Ana Beatriz Souza');
    await user.type(screen.getByLabelText('Buscar colaboradores'), 'Bruno');

    // Timeout maior que o padrão (1000ms): a busca passa por debounce
    // (300ms, `useDebouncedValue`) + nuqs + reset de cursor + resync de
    // `accumulated` — uma cadeia de efeitos a mais que o padrão mais direto
    // de `clients-page.tsx`, então a margem do `waitFor` precisa acompanhar.
    await waitFor(() => expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(await screen.findByText('Bruno Lima Costa')).toBeInTheDocument();
  });

  it('filtra por situação de acesso (convite pendente)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorsPage />);

    await screen.findByText('Ana Beatriz Souza');
    await user.click(screen.getByLabelText('Filtrar por situação de acesso'));
    await user.click(await screen.findByRole('option', { name: 'Convite pendente' }));

    await waitFor(() => expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument());
    expect(await screen.findByText('Diego Fernandes')).toBeInTheDocument();
  });

  it('mostra "Limpar filtros" com a busca ativa e restaura a listagem ao clicar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorsPage />);

    await screen.findByText('Ana Beatriz Souza');
    expect(screen.queryByRole('button', { name: /Limpar filtros/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar colaboradores'), 'Bruno');
    await waitFor(() => expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.click(await screen.findByRole('button', { name: /Limpar filtros/ }));

    expect(screen.getByLabelText('Buscar colaboradores')).toHaveValue('');
    expect(await screen.findByText('Ana Beatriz Souza')).toBeInTheDocument();
  });

  it('cadastra um novo colaborador sem acesso ao sistema (temAcesso: false)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorsPage />);

    await screen.findByText('Ana Beatriz Souza');
    await user.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await user.type(await screen.findByLabelText('Nome completo'), 'Fernanda Souza');
    await user.click(screen.getByRole('tab', { name: 'Contato' }));
    await user.type(screen.getByLabelText('E-mail'), 'fernanda.souza@exemplo.com');
    // Não marca "Permitir acesso ao sistema" — cadastro puro de RH.
    await user.click(screen.getByRole('button', { name: 'Cadastrar colaborador' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Fernanda Souza')).toBeInTheDocument();
  });

  it('remove (inativa) um colaborador via ConfirmDialog — soft-delete, continua na listagem com situação "Inativo"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorsPage />);

    const row = (await screen.findByText('Elisa Martins')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Ações para/ }));
    await user.click(await screen.findByText('Remover colaborador'));
    await user.click(await screen.findByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Soft-delete (mesma regra de `computeSituacaoAcesso`, `status: 'INATIVO'`
    // sempre vence): a consulta padrão ("Todos") não filtra por situação,
    // então Elisa continua na listagem, agora com o badge "Inativo".
    await waitFor(() => {
      const updatedRow = screen.getByText('Elisa Martins').closest('tr')!;
      expect(within(updatedRow).getByText('Inativo')).toBeInTheDocument();
    });
  });

  it('aplica múltiplos filtros simultaneamente e mantém tudo sincronizado na URL (nuqs) — reload simulado', async () => {
    const user = userEvent.setup();
    let lastQueryString = '';

    function Wrapper({ children }: { children: React.ReactNode }) {
      const [queryClient] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      );
      return (
        <NuqsTestingAdapter hasMemory onUrlUpdate={(event) => (lastQueryString = event.queryString)}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryClientProvider>
        </NuqsTestingAdapter>
      );
    }

    const { unmount } = render(<CollaboratorsPage />, { wrapper: Wrapper });
    await screen.findByText('Ana Beatriz Souza');

    await user.type(screen.getByLabelText('Buscar colaboradores'), 'a');
    await waitFor(() => expect(lastQueryString).toContain('q=a'));

    await user.click(screen.getByLabelText('Filtrar por acesso ao sistema'));
    await user.click(await screen.findByRole('option', { name: 'Com acesso' }));
    await waitFor(() => expect(lastQueryString).toContain('acesso=com_acesso'));

    await user.click(screen.getByLabelText('Filtrar por situação de acesso'));
    await user.click(await screen.findByRole('option', { name: 'Bloqueado' }));
    await waitFor(() => expect(lastQueryString).toContain('situacao=bloqueado'));

    // Os três filtros (q/acesso/situacao) coexistem na mesma URL.
    expect(lastQueryString).toContain('q=a');
    expect(lastQueryString).toContain('acesso=com_acesso');
    expect(lastQueryString).toContain('situacao=bloqueado');

    const urlAfterFilters = lastQueryString;
    unmount();

    // "Reload" — remonta a página com a URL capturada como estado inicial;
    // os três filtros devem vir aplicados de fábrica (sincronizados via nuqs).
    function ReloadWrapper({ children }: { children: React.ReactNode }) {
      const [queryClient] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      );
      return (
        <NuqsTestingAdapter searchParams={urlAfterFilters}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryClientProvider>
        </NuqsTestingAdapter>
      );
    }

    render(<CollaboratorsPage />, { wrapper: ReloadWrapper });
    expect(await screen.findByLabelText('Buscar colaboradores')).toHaveValue('a');
    expect(screen.getByRole('button', { name: /Limpar filtros/ })).toBeInTheDocument();
  });

  describe('visibilidade de ações administrativas', () => {
    it('OWNER (permissões completas) vê todas as ações de linha', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CollaboratorsPage />);

      const row = (await screen.findByText('Ana Beatriz Souza')).closest('tr')!;
      await user.click(within(row).getByRole('button', { name: /Ações para/ }));

      expect(await screen.findByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Configurar permissões')).toBeInTheDocument();
      expect(screen.getByText('Bloquear')).toBeInTheDocument();
      expect(screen.getByText('Suspender')).toBeInTheDocument();
      expect(screen.getByText('Remover acesso')).toBeInTheDocument();
      expect(screen.getByText('Revogar sessões')).toBeInTheDocument();
      expect(screen.getByText('Remover colaborador')).toBeInTheDocument();
    });

    it('usuário só com member:read não vê nenhuma ação de mutação', async () => {
      server.use(
        http.get(`${base}/me`, () =>
          HttpResponse.json({
            usuario: { id: 'mock-user-1', nome: 'Leitor', sobrenome: 'Mock', email: 'leitor@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
            membro: { id: 'mock-membro-1', papel: 'ASSISTENTE', permissions: ['office:read', 'member:read'] },
            escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
          }),
        ),
      );

      const user = userEvent.setup();
      renderWithProviders(<CollaboratorsPage />);

      const row = (await screen.findByText('Ana Beatriz Souza')).closest('tr')!;
      await user.click(within(row).getByRole('button', { name: /Ações para/ }));

      expect(await screen.findByText('Visualizar')).toBeInTheDocument();
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Configurar permissões')).not.toBeInTheDocument();
      expect(screen.queryByText('Bloquear')).not.toBeInTheDocument();
      expect(screen.queryByText('Suspender')).not.toBeInTheDocument();
      expect(screen.queryByText('Remover acesso')).not.toBeInTheDocument();
      expect(screen.queryByText('Revogar sessões')).not.toBeInTheDocument();
      expect(screen.queryByText('Remover colaborador')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Novo colaborador' })).not.toBeInTheDocument();
    });
  });
});
