import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useSimulationStore } from '@/stores/simulation.store';
import { SimulationBanner } from './simulation-banner';

describe('SimulationBanner', () => {
  afterEach(() => useSimulationStore.getState().stop());

  it('não renderiza nada fora de simulação', () => {
    const { container } = renderWithProviders(<SimulationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o membro simulado e sai da simulação ao clicar', async () => {
    useSimulationStore.getState().start('membro-1', 'Maria Oliveira (ADVOGADO)');
    const user = userEvent.setup();
    renderWithProviders(<SimulationBanner />);

    expect(screen.getByText('Maria Oliveira (ADVOGADO)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair da simulação' }));
    expect(useSimulationStore.getState().simulatingMembroId).toBeNull();
  });
});
