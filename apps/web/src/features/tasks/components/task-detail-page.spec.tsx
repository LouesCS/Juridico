import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { TaskDetailPage } from './task-detail-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tarefas/demo-tarefa-1',
  useSearchParams: () => new URLSearchParams(),
}));

describe('TaskDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra os dados da tarefa e o painel lateral', async () => {
    renderWithProviders(<TaskDetailPage taskId="tarefa-1" />);

    expect(await screen.findByRole('heading', { name: 'Protocolar contestação' })).toBeInTheDocument();
    expect(screen.getAllByText('Fazendo').length).toBeGreaterThan(0);
  });

  it('mostra estado de erro quando a tarefa não existe', async () => {
    renderWithProviders(<TaskDetailPage taskId="tarefa-inexistente" />);

    expect(await screen.findByText('Não foi possível carregar esta tarefa.')).toBeInTheDocument();
  });

  it('mostra o checklist e permite marcar um item como concluído', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDetailPage taskId="tarefa-1" />);

    await screen.findByRole('heading', { name: 'Protocolar contestação' });
    await user.click(screen.getByRole('tab', { name: 'Checklist' }));

    const checkbox = await screen.findByRole('checkbox', { name: 'Marcar "Anexar documentos" como concluído' });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('mostra as dependências e vínculos da tarefa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDetailPage taskId="tarefa-2" />);

    await screen.findByRole('heading', { name: 'Enviar relatório mensal' });

    await user.click(screen.getByRole('tab', { name: 'Vínculos' }));
    expect(await screen.findByText('client-1')).toBeInTheDocument();
  });

  it('adiciona um comentário na aba Comentários', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDetailPage taskId="tarefa-1" />);

    await screen.findByRole('heading', { name: 'Protocolar contestação' });
    await user.click(screen.getByRole('tab', { name: 'Comentários' }));

    const textarea = await screen.findByPlaceholderText('Adicionar um comentário...');
    await user.type(textarea, 'Comentário de teste.');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('Comentário de teste.')).toBeInTheDocument();
  });

  it('favorita a tarefa a partir do cabeçalho', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDetailPage taskId="tarefa-1" />);

    await screen.findByRole('heading', { name: 'Protocolar contestação' });
    const favoriteButton = screen.getByRole('button', { name: 'Favoritar' });
    await user.click(favoriteButton);

    expect(await screen.findByRole('button', { name: 'Remover dos favoritos' })).toBeInTheDocument();
  });
});
