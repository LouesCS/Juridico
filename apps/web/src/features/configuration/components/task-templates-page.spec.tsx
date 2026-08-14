import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskTemplatesPage } from './task-templates-page';

describe('TaskTemplatesPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista o modelo já cadastrado, com categoria e prazo', async () => {
    renderWithProviders(<TaskTemplatesPage />);

    expect(await screen.findByText('Contestação Padrão')).toBeInTheDocument();
    expect(screen.getByText('15 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Prazos Fatais')).toBeInTheDocument();
  });

  it('cria um novo modelo de tarefa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskTemplatesPage />);
    await screen.findByText('Contestação Padrão');

    await user.click(screen.getByRole('button', { name: 'Novo modelo' }));
    await user.type(await screen.findByLabelText('Nome'), 'Réplica Padrão');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Réplica Padrão')).toBeInTheDocument();
  });
});
