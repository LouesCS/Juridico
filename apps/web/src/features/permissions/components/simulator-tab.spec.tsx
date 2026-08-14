import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { useSimulationStore } from '@/stores/simulation.store';
import { SimulatorTab } from './simulator-tab';

describe('SimulatorTab', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  afterEach(() => useSimulationStore.getState().stop());

  it('lista só membros ativos para simular', async () => {
    renderWithProviders(<SimulatorTab />);

    const select = await screen.findByRole('combobox', { name: 'Selecionar membro para simular' });
    await userEvent.setup().click(select);

    expect(await screen.findByRole('option', { name: /Bruno Advogado/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Carla Assistente/ })).not.toBeInTheDocument(); // INATIVO
  });

  it('inicia a simulação e mostra o estado ativo com opção de sair', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SimulatorTab />);

    await user.click(await screen.findByRole('combobox', { name: 'Selecionar membro para simular' }));
    await user.click(await screen.findByRole('option', { name: /Bruno Advogado/ }));
    await user.click(screen.getByRole('button', { name: 'Simular' }));

    expect(await screen.findByText(/Simulando/)).toBeInTheDocument();
    expect(useSimulationStore.getState().simulatingMembroId).toBe('member-2');

    await user.click(screen.getByRole('button', { name: 'Sair da simulação' }));
    expect(useSimulationStore.getState().simulatingMembroId).toBeNull();
  });
});
