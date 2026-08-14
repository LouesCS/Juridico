import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { ExtraFieldsPage } from './extra-fields-page';

describe('ExtraFieldsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista o campo extra já cadastrado', async () => {
    renderWithProviders(<ExtraFieldsPage />);
    expect(await screen.findByText('Data de Nascimento')).toBeInTheDocument();
  });

  it('cria um novo campo extra e ele aparece na tabela', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtraFieldsPage />);
    await screen.findByText('Data de Nascimento');

    await user.click(screen.getByRole('button', { name: 'Novo campo extra' }));
    await user.type(await screen.findByLabelText('Nome'), 'Time do Coração');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Time do Coração')).toBeInTheDocument();
  });

  it('exclui um campo extra após confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtraFieldsPage />);
    await screen.findByText('Data de Nascimento');

    const row = screen.getByText('Data de Nascimento').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Excluir/ }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Data de Nascimento')).not.toBeInTheDocument());
  });
});
