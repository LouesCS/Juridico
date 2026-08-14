import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { AiSettingsPage } from './ai-settings-page';

describe('AiSettingsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('carrega a parametrização e reaproveita o AiUsageTab existente (consumo real)', async () => {
    renderWithProviders(<AiSettingsPage />);

    expect(await screen.findByLabelText('Modelo padrão (opcional)')).toBeInTheDocument();
    expect(await screen.findByText('Custo estimado')).toBeInTheDocument();
  });

  it('salva a cota mensal personalizada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSettingsPage />);

    const cota = await screen.findByLabelText('Cota mensal personalizada (substitui a do plano)');
    await user.type(cota, '50');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(cota).toHaveValue(50));
  });
});
