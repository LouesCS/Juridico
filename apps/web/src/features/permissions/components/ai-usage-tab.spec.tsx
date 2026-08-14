import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { AiUsageTab } from './ai-usage-tab';

describe('AiUsageTab', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra o consumo real de GET /office/ai-usage', async () => {
    renderWithProviders(<AiUsageTab />);

    expect(await screen.findByText('Resumos gerados')).toBeInTheDocument();
    expect(screen.getByText('Custo estimado')).toBeInTheDocument();
    expect(screen.getByText('Consumo por tipo de resumo')).toBeInTheDocument();
  });
});
