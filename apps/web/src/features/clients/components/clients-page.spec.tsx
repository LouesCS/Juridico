import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { ClientsPage } from './clients-page';

describe('ClientsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('lista os clientes reais de GET /clients', async () => {
    renderWithProviders(<ClientsPage />);

    expect(await screen.findByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('Acme Ltda')).toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por categoria')).not.toBeInTheDocument();
    expect(screen.queryByText('Contato')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('filtra clientes pela busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    await screen.findByText('João da Silva');
    await user.type(screen.getByLabelText('Buscar clientes'), 'Acme');

    await waitFor(() => expect(screen.queryByText('João da Silva')).not.toBeInTheDocument());
    expect(await screen.findByText('Acme Ltda')).toBeInTheDocument();
  });

  it('cadastra um novo cliente com sucesso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    await screen.findByText('João da Silva');
    await user.click(screen.getByRole('button', { name: 'Novo cliente' }));
    await user.type(await screen.findByLabelText('Nome completo'), 'Maria Souza');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
  });

  it('bloqueia a exclusão de um cliente com processos ativos (HAS_ACTIVE_LEGAL_CASES)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    const row = (await screen.findByText('Cliente Com Processo Ativo')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Ações/ }));
    await user.click(await screen.findByText('Excluir'));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    // O backend real (`DeleteClientUseCase`) rejeita com `HAS_ACTIVE_LEGAL_CASES`
    // — a mutation falha, o diálogo de confirmação fecha e o cliente
    // permanece na listagem (nunca removido otimisticamente).
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Cliente Com Processo Ativo')).toBeInTheDocument();
  });

  it('mostra estado vazio quando a busca não encontra clientes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    await screen.findByText('João da Silva');
    await user.type(screen.getByLabelText('Buscar clientes'), 'não existe nenhum assim');

    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument();
  });

  it('mostra "Limpar filtros" com a busca ativa e restaura a listagem ao clicar (Prompt 11)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientsPage />);

    await screen.findByText('João da Silva');
    expect(screen.queryByRole('button', { name: /Limpar filtros/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar clientes'), 'Acme');
    await waitFor(() => expect(screen.queryByText('João da Silva')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: /Limpar filtros/ }));

    expect(screen.getByLabelText('Buscar clientes')).toHaveValue('');
    expect(await screen.findByText('João da Silva')).toBeInTheDocument();
  });
});
