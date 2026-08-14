import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { ConfigurationDashboardPage } from './configuration-dashboard-page';

describe('ConfigurationDashboardPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra as métricas de catálogo, consumo de IA e últimas alterações reais', async () => {
    renderWithProviders(<ConfigurationDashboardPage />);

    expect(await screen.findByText('Campos Extras')).toBeInTheDocument();
    expect(screen.getByText('Providers configurados')).toBeInTheDocument();
    expect(screen.getByText('Últimas Alterações')).toBeInTheDocument();
    expect(screen.getByText('Campo extra criado')).toBeInTheDocument();
  });
});
