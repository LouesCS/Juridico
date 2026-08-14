import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskCategoriesPage } from './task-categories-page';

describe('TaskCategoriesPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista a categoria já cadastrada', async () => {
    renderWithProviders(<TaskCategoriesPage />);
    expect(await screen.findByText('Prazos Fatais')).toBeInTheDocument();
  });

  it('cria uma nova categoria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskCategoriesPage />);
    await screen.findByText('Prazos Fatais');

    await user.click(screen.getByRole('button', { name: 'Nova categoria' }));
    await user.type(await screen.findByLabelText('Nome'), 'Financeiro');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Financeiro')).toBeInTheDocument();
  });

  it('exclui uma categoria após confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskCategoriesPage />);
    await screen.findByText('Prazos Fatais');

    const row = screen.getByText('Prazos Fatais').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Excluir/ }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Prazos Fatais')).not.toBeInTheDocument());
  });
});
