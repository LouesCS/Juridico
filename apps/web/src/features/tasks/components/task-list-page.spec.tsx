import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskListPage } from './task-list-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tarefas/minhas',
  useSearchParams: () => new URLSearchParams(),
}));

describe('TaskListPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista as tarefas reais de GET /tasks', async () => {
    renderWithProviders(<TaskListPage scope="meus" title="Minhas Tarefas" />);

    expect(await screen.findByText('Protocolar contestação')).toBeInTheDocument();
  });

  it('filtra tarefas pela busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskListPage scope="meus" title="Minhas Tarefas" />);

    await screen.findByText('Protocolar contestação');
    await user.type(screen.getByLabelText('Buscar tarefas'), 'relatório');

    await waitFor(() => expect(screen.queryByText('Protocolar contestação')).not.toBeInTheDocument());
    expect(await screen.findByText('Enviar relatório mensal')).toBeInTheDocument();
  });

  it('conclui uma tarefa sem checklist obrigatório pendente e ela some da lista de pendentes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskListPage scope="meus" title="Minhas Tarefas" />);

    await screen.findByText('Enviar relatório mensal');
    await user.click(screen.getByRole('button', { name: 'Ações para Enviar relatório mensal' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Concluir' }));

    await waitFor(() => expect(screen.queryByText('Enviar relatório mensal')).not.toBeInTheDocument());
  });

  it('bloqueia a conclusão quando há checklist obrigatório pendente (tarefa continua visível)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskListPage scope="meus" title="Minhas Tarefas" />);

    await screen.findByText('Protocolar contestação');
    await user.click(screen.getByRole('button', { name: 'Ações para Protocolar contestação' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Concluir' }));

    // POST /tasks/:id/complete responde 409 TASK_CHECKLIST_PENDING (mock) —
    // a tarefa nunca é marcada como concluída, então continua na lista de
    // pendentes (comportamento estável, sem depender de um <Toaster/> montado).
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Concluir' })).not.toBeInTheDocument());
    expect(screen.getByText('Protocolar contestação')).toBeInTheDocument();
  });

  it('abre o diálogo de nova tarefa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskListPage scope="meus" title="Minhas Tarefas" />);

    await screen.findByText('Protocolar contestação');
    await user.click(screen.getByRole('button', { name: 'Nova tarefa' }));

    expect(await screen.findByRole('dialog', { name: 'Nova tarefa' })).toBeInTheDocument();
  });
});
