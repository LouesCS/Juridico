import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { CargosPage } from './cargos-page';

/**
 * `cargos-page.tsx` reporta erros via `toast.error` (sonner) — o wrapper de
 * teste (`test/render.tsx`) não monta um `<Toaster />`, então nada de sonner
 * aparece no DOM/jsdom. Mesma limitação vale para qualquer outra tela deste
 * projeto que só reporta erro por toast — aqui, em vez de tentar
 * `findByText` (nunca encontraria nada), mocka-se `sonner` e verifica a
 * chamada em si.
 */
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>();
  return { ...actual, toast: { ...actual.toast, error: vi.fn(), success: vi.fn() } };
});

describe('CargosPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
    vi.mocked(toast.error).mockClear();
  });

  it('lista os cargos já cadastrados (seed: Advogado, Advogado Sênior, Estagiário, Analista Administrativo)', async () => {
    renderWithProviders(<CargosPage />);

    expect(await screen.findByText('Advogado')).toBeInTheDocument();
    expect(screen.getByText('Advogado Sênior')).toBeInTheDocument();
    expect(screen.getByText('Estagiário')).toBeInTheDocument();
    expect(screen.getByText('Analista Administrativo')).toBeInTheDocument();
  });

  it('cria um novo cargo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CargosPage />);
    await screen.findByText('Advogado');

    await user.click(screen.getByRole('button', { name: 'Novo cargo' }));
    await user.type(await screen.findByLabelText('Nome'), 'Coordenador Jurídico');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Coordenador Jurídico')).toBeInTheDocument();
  });

  it('bloqueia a criação de um cargo com nome já existente (DUPLICATE_NAME)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CargosPage />);
    await screen.findByText('Advogado');

    await user.click(screen.getByRole('button', { name: 'Novo cargo' }));
    await user.type(await screen.findByLabelText('Nome'), 'Advogado');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Já existe um cargo com este nome.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edita o nome e a ordem de um cargo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CargosPage />);
    await screen.findByText('Estagiário');

    const row = screen.getByText('Estagiário').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Editar/ }));
    const nomeInput = await screen.findByLabelText('Nome');
    await user.clear(nomeInput);
    await user.type(nomeInput, 'Estagiário de Direito');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Estagiário de Direito')).toBeInTheDocument();
  });

  it('exclui um cargo após confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CargosPage />);
    await screen.findByText('Analista Administrativo');

    const row = screen.getByText('Analista Administrativo').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Excluir/ }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Analista Administrativo')).not.toBeInTheDocument());
  });

  it('alterna o status ativo/inativo de um cargo pelo Switch', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CargosPage />);
    await screen.findByText('Advogado');

    const row = screen.getByText('Advogado').closest('tr')!;
    const toggle = within(row).getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  });
});
