import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { PublicationsPage } from './publications-page';

describe('PublicationsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('lista a grid consolidada e mantém Pasta e Processo formal navegáveis', async () => {
    renderWithProviders(<PublicationsPage />);

    expect(await screen.findByText('1234567-19.2024.8.26.0001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ação de indenização' })).toHaveAttribute(
      'href',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(screen.getByRole('link', { name: 'MARIA/1' })).toHaveAttribute(
      'href',
      '/pastas/pasta-demo-1',
    );
    expect(screen.getByText('Maria Oliveira')).not.toHaveAttribute('href');
  });

  it('mostra os subcabeçalhos uma única vez e mantém somente valores nas linhas', async () => {
    renderWithProviders(<PublicationsPage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const table = cnj.closest('table')!;
    const rows = within(table).getAllByRole('row');
    const firstPublication = rows[1];
    const publicationWithoutLinks = rows[2];

    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).queryByText('Publicação', { exact: true })).not.toBeInTheDocument();
    expect(within(table).queryByText('Origem', { exact: true })).not.toBeInTheDocument();
    expect(within(table).queryByText('Vínculos', { exact: true })).not.toBeInTheDocument();

    for (const label of [
      'DATA DA PUBLICAÇÃO',
      'DATA DE CADASTRO',
      'DESCRIÇÃO',
      'DIÁRIO',
      'CIDADE',
      'ÓRGÃO',
      'VARA',
      'NOME DE VÍNCULO',
      'PROCESSO NA PUBLICAÇÃO',
      'PASTA',
      'PROCESSO VINCULADO',
    ]) {
      expect(within(table).getAllByText(label, { exact: true })).toHaveLength(1);
      expect(within(firstPublication).queryByText(label, { exact: true })).not.toBeInTheDocument();
    }

    expect(
      within(firstPublication).getByText('Diário da Justiça Eletrônico Nacional'),
    ).toBeVisible();
    expect(within(firstPublication).getByText('São Paulo')).toBeVisible();
    expect(within(firstPublication).getByText('Maria Oliveira')).toBeVisible();
    expect(within(firstPublication).getByText('0')).toBeVisible();
    expect(within(firstPublication).getByRole('link', { name: /08\/08\/2026/ })).toHaveAttribute(
      'href',
      '/publicacoes/publication-1',
    );
    expect(within(publicationWithoutLinks).getAllByText('--').length).toBeGreaterThan(0);
  });

  it('abre o detalhe pelo botão e exibe publicação, movimentação, IA e relacionados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const row = cnj.closest('tr')!;

    await user.click(within(row).getByRole('button', { name: 'Ações da publicação' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Visualizar' }));

    expect(
      await screen.findByRole('heading', { name: 'Detalhe da publicação' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Movimentação' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumo IA' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Relacionados' })).toBeInTheDocument();
  });

  it('oculta a publicação sem remover seus vínculos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const row = cnj.closest('tr')!;

    await user.click(within(row).getByRole('button', { name: 'Ações da publicação' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ocultar' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'MARIA/1' })).toBeInTheDocument());
  });

  it('mostra o estado vazio ao consultar sem resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    await screen.findByText('1234567-19.2024.8.26.0001');

    await user.click(screen.getByRole('button', { name: 'Mais filtros' }));
    const panel = screen.getByRole('dialog', { name: 'Mais filtros' });
    await user.type(within(panel).getByLabelText('Cidade'), 'Cidade inexistente');
    await user.click(within(panel).getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText('Nenhuma publicação encontrada.')).toBeInTheDocument();
  });

  it('expõe somente os filtros funcionais da tela global', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    await screen.findByText('1234567-19.2024.8.26.0001');

    await user.click(screen.getByRole('button', { name: 'Mais filtros' }));

    expect(screen.getByLabelText('Cidade')).toBeInTheDocument();
    expect(screen.getByLabelText('Processo na publicação')).toBeInTheDocument();
    expect(screen.getByLabelText('Clientes da pasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Processos')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Pesquisa')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Situação')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tribunal')).not.toBeInTheDocument();
  });

  it('remove os cards e mantém somente os dois filtros principais expostos', async () => {
    renderWithProviders(<PublicationsPage />);
    await screen.findByText('1234567-19.2024.8.26.0001');

    for (const card of [
      'Total de publicações',
      'Novas',
      'Lidas',
      'Pendentes',
      'Última sincronização',
    ])
      expect(screen.queryByText(card, { exact: true })).not.toBeInTheDocument();

    expect(screen.getByLabelText('Buscar publicações')).toBeVisible();
    expect(screen.getByLabelText('Visualização')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mais filtros' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeVisible();
    expect(screen.queryByLabelText('Cidade')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Diário')).not.toBeInTheDocument();
  });

  it('cancela o rascunho e limpa somente filtros avançados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    await screen.findByText('1234567-19.2024.8.26.0001');

    await user.type(screen.getByLabelText('Buscar publicações'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Mais filtros' }));
    let panel = screen.getByRole('dialog', { name: 'Mais filtros' });
    expect(within(panel).queryByLabelText('Visualização')).not.toBeInTheDocument();
    await user.type(within(panel).getByLabelText('Cidade'), 'Curitiba');
    await user.click(within(panel).getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Mais filtros' }));
    panel = screen.getByRole('dialog', { name: 'Mais filtros' });
    expect(within(panel).getByLabelText('Cidade')).toHaveValue('');
    await user.type(within(panel).getByLabelText('Cidade'), 'São Paulo');
    await user.click(within(panel).getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByRole('button', { name: 'Mais filtros (1)' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mais filtros (1)' }));
    panel = screen.getByRole('dialog', { name: 'Mais filtros' });
    await user.click(within(panel).getByRole('button', { name: 'Limpar' }));
    expect(within(panel).getByLabelText('Cidade')).toHaveValue('');
    expect(screen.getByLabelText('Buscar publicações')).toHaveValue('Maria');
  });
});
