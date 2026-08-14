import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { JudicialMovementsPage } from './judicial-movements-page';

describe('JudicialMovementsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });

  it('renderiza exatamente os cinco blocos e o total real', async () => {
    renderWithProviders(<JudicialMovementsPage />);
    expect(
      await screen.findByRole('heading', { name: 'Movimentações judiciais (2)' }),
    ).toBeInTheDocument();
    for (const label of [
      'DATA DA MOVIMENTAÇÃO',
      'DATA DE CADASTRO',
      'DESCRIÇÃO',
      'LEITURA / ORIGEM',
      'PASTA',
      'PROCESSO',
      'TAREFAS',
      'AÇÕES',
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('usa links reais e o padrão visual compartilhado', async () => {
    renderWithProviders(<JudicialMovementsPage />);
    const row = (
      await screen.findByText(
        'Expedição de intimação eletrônica para manifestação da parte autora.',
      )
    ).closest('tr')!;
    const links = [
      within(row).getByRole('link', { name: '09/08/2026' }),
      within(row).getByRole('link', { name: 'MARIA OLIVEIRA/1' }),
      within(row).getByRole('link', { name: '1234567-19.2024.8.26.0001' }),
      within(row).getByRole('link', { name: 'Analisar intimação' }),
    ];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/movimentacoes-judiciais/movement-1',
      '/pastas/folder-legal-1',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '/tarefas/task-judicial-1',
    ]);
    for (const link of links) expect(link).toHaveClass('hover:underline', 'focus-visible:ring-2');
  });

  it('abre Mais filtros e oferece os seletores relacionais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JudicialMovementsPage />);
    await screen.findByText('Expedição de intimação eletrônica para manifestação da parte autora.');
    await user.click(screen.getByRole('button', { name: 'Mais filtros' }));
    expect(
      screen.getByRole('heading', { name: 'Filtros de movimentações judiciais' }),
    ).toBeInTheDocument();
    for (const label of [
      'Clientes da pasta',
      'Encarregados da pasta',
      'Partes contrárias da pasta',
      'Pastas',
      'Processos',
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Visualizar e leitura funcionam pelo menu contextual', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JudicialMovementsPage />);
    const row = (
      await screen.findByText(
        'Expedição de intimação eletrônica para manifestação da parte autora.',
      )
    ).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Ações da movimentação' }));
    expect(await screen.findByRole('menuitem', { name: 'Visualizar' })).toHaveAttribute(
      'href',
      '/movimentacoes-judiciais/movement-1',
    );
    await user.keyboard('{Escape}');
    await user.click(within(row).getByRole('button', { name: 'Ações da movimentação' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Marcar como lida' }));
    await waitFor(() => expect(within(row).getByText(/Lida · Capturada/)).toBeInTheDocument());
  });

  it('consulta e apresenta estado vazio', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JudicialMovementsPage />);
    await screen.findByText('Expedição de intimação eletrônica para manifestação da parte autora.');
    await user.type(screen.getByLabelText('Buscar movimentações'), 'vazio');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(
      await screen.findByText('Nenhuma movimentação judicial encontrada.'),
    ).toBeInTheDocument();
  });
});
