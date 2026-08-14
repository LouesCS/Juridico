import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { RequiredFieldsPage } from './required-fields-page';

describe('RequiredFieldsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('marca um campo como obrigatório e salva', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RequiredFieldsPage />);

    const checkbox = await screen.findByRole('checkbox', { name: 'enderecoLogradouro' });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(checkbox).toBeChecked());
  });
});
