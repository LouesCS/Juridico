import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskKanbanPage } from './task-kanban-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tarefas/kanban',
  useSearchParams: () => new URLSearchParams(),
}));

describe('TaskKanbanPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('renderiza somente as quatro macrocolunas na ordem definida e os cartões de tarefa', async () => {
    renderWithProviders(<TaskKanbanPage />);

    expect(await screen.findByText('A Fazer')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent?.replace(/\d+$/, ''));
    expect(headings).toEqual(['A Fazer', 'Fazendo', 'Concluídos', 'Cancelados']);
    expect(screen.queryByText('Em Andamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Em Revisão')).not.toBeInTheDocument();
    expect(await screen.findByText('Protocolar contestação')).toBeInTheDocument();
  });
});
