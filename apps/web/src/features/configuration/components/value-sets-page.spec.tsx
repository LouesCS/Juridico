import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { ValueSetsPage } from './value-sets-page';

describe('ValueSetsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista o conjunto e mostra o valor ao selecioná-lo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ValueSetsPage />);

    await user.click(await screen.findByRole('button', { name: /Área do Direito/ }));

    expect(await screen.findByRole('heading', { name: 'Área do Direito' })).toBeInTheDocument();
    expect(screen.getByText('Cível')).toBeInTheDocument();
  });

  it('adiciona um novo valor ao conjunto selecionado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ValueSetsPage />);

    await user.click(await screen.findByRole('button', { name: /Área do Direito/ }));
    await screen.findByRole('heading', { name: 'Área do Direito' });

    await user.type(screen.getByPlaceholderText('Novo valor'), 'Tributário');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(screen.getByPlaceholderText('Novo valor')).toHaveValue(''));
    expect(await screen.findByText('Tributário')).toBeInTheDocument();
  });

  it('cria um novo conjunto de valores', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ValueSetsPage />);
    await screen.findByText('Área do Direito');

    await user.click(screen.getByRole('button', { name: 'Novo' }));
    await user.type(await screen.findByLabelText('Nome'), 'Status de Cobrança');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: /Status de Cobrança/ })).toBeInTheDocument();
  });
});
