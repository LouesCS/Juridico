import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { CollaboratorGroupsPage } from './collaborator-groups-page';

describe('CollaboratorGroupsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista o grupo e mostra o membro ao selecioná-lo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorGroupsPage />);

    await user.click(await screen.findByRole('button', { name: /Equipe Cível/ }));

    expect(await screen.findByRole('heading', { name: 'Equipe Cível' })).toBeInTheDocument();
    expect(screen.getByText('Usuária Mock')).toBeInTheDocument();
  });

  it('cria um novo grupo de colaboradores', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorGroupsPage />);
    await screen.findByText('Equipe Cível');

    await user.click(screen.getByRole('button', { name: 'Novo' }));
    await user.type(await screen.findByLabelText('Nome'), 'Equipe Trabalhista');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: /Equipe Trabalhista/ })).toBeInTheDocument();
  });
});
