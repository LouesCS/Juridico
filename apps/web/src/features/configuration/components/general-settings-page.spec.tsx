import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { GeneralSettingsPage } from './general-settings-page';

describe('GeneralSettingsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('carrega os valores atuais e salva alterações', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneralSettingsPage />);

    const moeda = await screen.findByLabelText('Moeda padrão (ISO 4217)');
    expect(moeda).toHaveValue('BRL');

    await user.clear(moeda);
    await user.type(moeda, 'USD');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(moeda).toHaveValue('USD'));
  });
});
