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

  it('lista dados normalizados e mantém Processo e Cliente navegáveis', async () => {
    renderWithProviders(<PublicationsPage />);

    expect(await screen.findByText('1234567-19.2024.8.26.0001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ação de indenização' })).toHaveAttribute(
      'href',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(screen.getByRole('link', { name: 'Maria Oliveira' })).toHaveAttribute(
      'href',
      '/clientes/11111111-1111-4111-8111-111111111111',
    );
  });

  it('abre o detalhe pelo botão e exibe publicação, movimentação, IA e relacionados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const row = cnj.closest('tr')!;

    await user.click(within(row).getByRole('button', { name: 'Visualizar publicação' }));

    expect(await screen.findByRole('heading', { name: 'Detalhe da publicação' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Movimentação' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumo IA' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Relacionados' })).toBeInTheDocument();
  });

  it('marca a publicação como lida imediatamente sem afetar os vínculos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    const cnj = await screen.findByText('1234567-19.2024.8.26.0001');
    const row = cnj.closest('tr')!;

    await user.click(within(row).getByRole('button', { name: 'Marcar como lida' }));

    await waitFor(() => expect(screen.getAllByText('LIDA').length).toBeGreaterThan(0));
    expect(screen.getByRole('link', { name: 'Maria Oliveira' })).toBeInTheDocument();
  });

  it('mostra o estado vazio ao consultar sem resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicationsPage />);
    await screen.findByText('1234567-19.2024.8.26.0001');

    await user.type(screen.getByLabelText('Pesquisa'), 'vazio');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText('Nenhuma publicação encontrada.')).toBeInTheDocument();
  });
});
