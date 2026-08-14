import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { AiInsightsCard } from './ai-insights-card';

describe('AiInsightsCard', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra os insights reais retornados pelo backend', async () => {
    renderWithProviders(<AiInsightsCard />);
    expect(await screen.findByText(/prazos críticos/)).toBeInTheDocument();
    expect(screen.getByText('Resposta gerada por IA. Revise antes de utilizar.')).toBeInTheDocument();
  });

  it('mostra o selo "IA" no cabeçalho', async () => {
    renderWithProviders(<AiInsightsCard />);
    await screen.findByText(/prazos críticos/);
    expect(screen.getByText('IA')).toBeInTheDocument();
  });
});
