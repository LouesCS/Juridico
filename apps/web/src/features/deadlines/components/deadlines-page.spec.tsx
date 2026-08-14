import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { DeadlinesPage } from './deadlines-page';

describe('DeadlinesPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista os prazos reais de GET /deadlines', async () => {
    renderWithProviders(<DeadlinesPage />);

    expect(await screen.findByText('Contestação')).toBeInTheDocument();
    expect(screen.getByText('Audiência de conciliação')).toBeInTheDocument();
  });

  it('filtra prazos pela busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeadlinesPage />);

    await screen.findByText('Contestação');
    await user.type(screen.getByLabelText('Buscar prazos'), 'Audiência');

    await waitFor(() => expect(screen.queryByText('Contestação')).not.toBeInTheDocument());
    expect(await screen.findByText('Audiência de conciliação')).toBeInTheDocument();
  });

  it('troca para a visualização de calendário', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeadlinesPage />);

    await screen.findByText('Contestação');
    await user.click(screen.getByRole('button', { name: 'Calendário' }));

    expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
  });

  it('mostra as abas de filtro rápido (Hoje, Amanhã, Esta semana, etc.)', async () => {
    renderWithProviders(<DeadlinesPage />);

    await screen.findByText('Contestação');
    expect(screen.getByRole('tab', { name: 'Vencidos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Concluídos' })).toBeInTheDocument();
  });
});
