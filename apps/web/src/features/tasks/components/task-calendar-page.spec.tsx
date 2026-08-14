import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskCalendarPage } from './task-calendar-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tarefas/calendario',
  useSearchParams: () => new URLSearchParams(),
}));

describe('TaskCalendarPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('renderiza o calendário mensal com a navegação Dia/Semana/Mês', async () => {
    renderWithProviders(<TaskCalendarPage />);

    expect(await screen.findByRole('tab', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Semana' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dia' })).toBeInTheDocument();
  });
});
