import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { ExtrajudicialMovementsPage } from './extrajudicial-movements-page';

describe('ExtrajudicialMovementsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });

  it('renderiza somente os cinco blocos funcionais da grid', async () => {
    renderWithProviders(<ExtrajudicialMovementsPage />);
    await screen.findByText('Contato realizado para negociação de acordo.');
    for (const heading of [
      'DATA DA MOVIMENTAÇÃO',
      'DATA DE CADASTRO',
      'DESCRIÇÃO',
      'LEITURA',
      'PASTA',
      'PROCESSO',
      'TAREFAS',
      'AÇÕES',
    ])
      expect(screen.getByText(heading)).toBeInTheDocument();
    for (const removed of [
      'Cliente',
      'Pasta Jurídica',
      'Pasta documental',
      'Tipo',
      'Responsável',
      'Origem',
      'Resumo',
      'Situação',
      'Favorito',
    ])
      expect(screen.queryByRole('columnheader', { name: removed })).not.toBeInTheDocument();
  });

  it('usa IDs reais na navegação de Pasta e Processo', async () => {
    renderWithProviders(<ExtrajudicialMovementsPage />);
    const text = await screen.findByText('Contato realizado para negociação de acordo.');
    const row = text.closest('tr')!;
    const folderLink = within(row).getByRole('link', { name: 'MARIA OLIVEIRA/1' });
    const caseLink = within(row).getByRole('link', { name: 'Negociação administrativa — Maria Oliveira' });
    expect(folderLink).toHaveAttribute(
      'href',
      '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(caseLink).toHaveAttribute(
      'href',
      '/processos/case-extra-1',
    );
    for (const link of [folderLink, caseLink]) {
      expect(link).toHaveClass('hover:underline');
      expect(link).toHaveClass('focus-visible:ring-2');
      expect(link).toHaveClass('underline-offset-4');
      expect(link).not.toHaveClass('underline');
    }
    expect(folderLink).not.toBe(caseLink);
  });

  it('abre o painel com filtros nomeados e seletores remotos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtrajudicialMovementsPage />);
    await screen.findByText('Contato realizado para negociação de acordo.');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    for (const label of [
      'Data da movimentação',
      'Data de cadastro',
      'Clientes da pasta',
      'Encarregados da pasta',
      'Partes contrárias da pasta',
      'Pastas',
      'Processos',
      'Leitura',
      'Vínculo em tarefas',
      'Timeline',
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeInTheDocument();
  });

  it('a Data da Movimentação abre a rota real de detalhe e cadastro não é link', async () => {
    renderWithProviders(<ExtrajudicialMovementsPage />);
    const movementDate = await screen.findByRole('link', { name: '09/08/2026' });
    expect(movementDate).toHaveAttribute('href', '/movimentacoes-extrajudiciais/extra-1');
    const row = movementDate.closest('tr')!;
    expect(within(row).getAllByText('09/08/2026')).toHaveLength(2);
    expect(within(row).getAllByRole('link', { name: '09/08/2026' })).toHaveLength(1);
  });

  it('oferece Visualizar no menu e aponta para o mesmo detalhe global', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtrajudicialMovementsPage />);
    await screen.findByText('Contato realizado para negociação de acordo.');
    await user.click(screen.getByRole('button', { name: 'Ações da movimentação' }));
    expect(await screen.findByRole('menuitem', { name: 'Visualizar' })).toHaveAttribute(
      'href',
      '/movimentacoes-extrajudiciais/extra-1',
    );
  });

  it('não oferece criação manual de movimentação', async () => {
    renderWithProviders(<ExtrajudicialMovementsPage />);
    await screen.findByText('Contato realizado para negociação de acordo.');
    expect(screen.queryByRole('button', { name: /Nova movimentação/ })).not.toBeInTheDocument();
  });
});
