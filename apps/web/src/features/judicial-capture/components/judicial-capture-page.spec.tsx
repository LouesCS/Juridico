import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { JudicialCapturePage } from './judicial-capture-page';

describe('JudicialCapturePage', () => {
  function renderWithUrlTracking(onUrlUpdate: (query: string) => void) {
    function Wrapper({ children }: { children: React.ReactNode }) {
      const [queryClient] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      );
      return (
        <NuqsTestingAdapter hasMemory onUrlUpdate={(event) => onUrlUpdate(event.queryString)}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryClientProvider>
        </NuqsTestingAdapter>
      );
    }
    return render(<JudicialCapturePage />, { wrapper: Wrapper });
  }
  beforeEach(() => {
    window.history.replaceState({}, '', '/configuracoes-captura');
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });
  it('compõe busca geral, Pasta rica, situações múltiplas e filtros na URL', async () => {
    const user = userEvent.setup();
    let queryString = '';
    renderWithUrlTracking((query) => (queryString = query));
    await screen.findAllByText('1234567-19.2024.8.26.0001');

    await user.type(screen.getByLabelText('Buscar configurações de captura'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Pasta' }));
    expect(screen.getByText('Assunto: Responsabilidade civil')).toBeInTheDocument();
    expect(screen.getByText('Encarregado: João Silva')).toBeInTheDocument();
    expect(screen.getByText('Cliente principal: Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Parte contrária principal: Empresa XYZ')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /MARIA OLIVEIRA\/1/ }));

    await user.click(screen.getByRole('button', { name: 'Situação' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Ativa' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Com problema' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Situação' })).toHaveTextContent('2 situações');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    await waitFor(() => {
      expect(queryString).toContain('q=Maria');
      expect(queryString).toContain('pasta=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
      expect(decodeURIComponent(queryString)).toContain('status=ATIVA,ERRO');
    });
  });

  it('abre Mais filtros, conta filtros avançados e Limpar remove todo o estado', async () => {
    const user = userEvent.setup();
    let queryString = '';
    renderWithUrlTracking((query) => (queryString = query));
    await screen.findByText('1234567-19.2024.8.26.0001');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    const sheet = screen.getByRole('dialog');
    await user.type(within(sheet).getByLabelText('Cliente'), 'Maria');
    await user.type(
      within(sheet).getByLabelText('Data inicial', { selector: '#cadastro-de' }),
      '2026-08-01',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Consultar' }));
    await waitFor(() => expect(queryString).toContain('cliente=Maria'));
    expect(screen.getByRole('button', { name: /Mais filtros/ })).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(queryString).toBe(''));
  });
  it('lista configuração com Processo e Cliente navegáveis', async () => {
    renderWithProviders(<JudicialCapturePage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const row = cnj.closest('tr')!;
    expect(screen.getByRole('columnheader', { name: 'Pasta' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Data de cadastro' })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'MARIA OLIVEIRA/1' })).toHaveAttribute(
      'href',
      '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(within(row).getByText('01/08/2026')).toBeInTheDocument();
    const noFolderRow = (await screen.findByText('0000000-00.2026.8.26.0001')).closest('tr')!;
    expect(within(noFolderRow).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ação de indenização' })).toHaveAttribute(
      'href',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(screen.getByRole('link', { name: 'Maria Oliveira' })).toHaveAttribute(
      'href',
      '/clientes/11111111-1111-4111-8111-111111111111',
    );
  });
  it('bloqueia CNJ inválido antes de salvar', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/configuracoes-captura?nova=1&clienteId=11111111-1111-4111-8111-111111111111');
    renderWithProviders(<JudicialCapturePage />);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Número CNJ'), '123');
    expect(screen.getByText('Número CNJ inválido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Verificar processo' })).toBeDisabled();
  });
  it('verifica e cria configuração sem criar Processo automaticamente', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/configuracoes-captura?nova=1&clienteId=11111111-1111-4111-8111-111111111111');
    renderWithProviders(<JudicialCapturePage />);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Número CNJ'), '1234567-19.2024.8.26.0001');
    await user.click(screen.getByRole('button', { name: 'Verificar processo' }));
    expect(await screen.findByText('Processo encontrado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('não oferece criação na listagem global', async () => {
    renderWithProviders(<JudicialCapturePage />);
    await screen.findAllByText('1234567-19.2024.8.26.0001');
    expect(screen.queryByRole('button', { name: 'Nova configuração' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar configuração' })).not.toBeInTheDocument();
  });
  it('sincroniza imediatamente pela ação protegida', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JudicialCapturePage />);
    const cnj = (await screen.findAllByText('1234567-19.2024.8.26.0001'))[0];
    const row = cnj.closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Ações de/ }));
    await user.click(await screen.findByText('Sincronizar agora'));
    await waitFor(() => expect(within(row).getByText('1')).toBeInTheDocument());
  });
});
