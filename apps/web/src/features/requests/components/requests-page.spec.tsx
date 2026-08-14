import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { RequestsPage } from './requests-page';

describe('RequestsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });

  it('renderiza blocos verticais sem barras e preserva links', async () => {
    renderWithProviders(<RequestsPage />);
    expect(await screen.findByRole('heading', { name: 'Pedidos (1)' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'DESCRIÇÃOCATEGORIA',
      'PASTAPROCESSO',
      'VALOR PEDIDOESTIMATIVA DE ÊXITO',
      'VALOR PROVÁVELVALOR POSSÍVELVALOR REMOTO',
      'SITUAÇÃODATA DE FINALIZAÇÃOVALOR FINAL',
      'AÇÕES',
    ]);
    headers.forEach((header) => expect(header).not.toHaveTextContent('/'));
    expect(screen.getByRole('link', { name: 'Danos morais' })).toHaveAttribute(
      'href',
      '/pedidos/request-1',
    );
    expect(screen.getByRole('link', { name: 'MARIA OLIVEIRA/1' })).toHaveAttribute(
      'href',
      '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByText('EM_ANDAMENTO')).not.toBeInTheDocument();
  });

  it('mantém o menu de ações funcional', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RequestsPage />);
    const button = await screen.findByRole('button', { name: 'Ações de Danos morais' });
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: 'Visualizar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toBeInTheDocument();
  });
});
