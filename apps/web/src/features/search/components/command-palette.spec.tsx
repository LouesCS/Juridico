import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { useCommandPaletteStore } from '@/stores/command-palette.store';
import { clearRecentItems, pushRecentItem } from '../domain/recent-items';
import { clearSearchHistory } from '../domain/search-history';
import { CommandPalette } from './command-palette';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function getListbox() {
  return document.getElementById('palette-listbox') as HTMLElement;
}

describe('CommandPalette', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
    useCommandPaletteStore.getState().close();
    clearRecentItems();
    clearSearchHistory();
    push.mockClear();
  });

  it('fica fechado por padrão e abre ao chamar open() (mesmo gatilho do Ctrl+K/⌘K)', async () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    act(() => useCommandPaletteStore.getState().open());
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });

  it('estado vazio mostra recentes e sugestões (nunca uma lista em branco sem explicação)', async () => {
    pushRecentItem({
      id: 'client-1',
      tipo: 'clients',
      titulo: 'Maria Oliveira',
      subtitulo: null,
      url: '/clientes/client-1',
    });
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    expect(await within(getListbox()).findByText('Maria Oliveira')).toBeInTheDocument();
    expect(within(getListbox()).queryByText('Novo Processo')).not.toBeInTheDocument();
  });

  it('busca agrupada por categoria — digitar "silva" retorna Clientes, Processos e Documentos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    const input = await screen.findByRole('combobox');
    await user.type(input, 'silva');

    const listbox = getListbox();
    expect(await within(listbox).findByText('João Silva')).toBeInTheDocument();
    expect(within(listbox).getByText('Processos')).toBeInTheDocument();
    expect(within(listbox).getByText('Clientes')).toBeInTheDocument();
    expect(within(listbox).getByText('Documentos')).toBeInTheDocument();
    expect(within(listbox).getByText('Procuração — Silva.pdf')).toBeInTheDocument();
  });

  it('sem resultado mostra mensagem clara, não uma tela em branco', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    const input = await screen.findByRole('combobox');
    await user.type(input, 'zzznadaaqui');

    expect(await screen.findByText(/Nenhum resultado para/)).toBeInTheDocument();
  });

  it('navegação por teclado: seta para baixo move a seleção e Enter navega + fecha', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    const input = await screen.findByRole('combobox');
    await user.type(input, 'silva');
    await waitFor(() =>
      expect(within(getListbox()).getAllByRole('option').length).toBeGreaterThan(0),
    );

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Tab cicla o filtro de escopo sem perder o foco do campo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    const input = await screen.findByRole('combobox');
    await user.type(input, 'silva');
    await waitFor(() =>
      expect(within(getListbox()).getAllByRole('option').length).toBeGreaterThan(0),
    );

    await user.keyboard('{Tab}');

    expect(await screen.findByRole('button', { name: 'Processos' })).toHaveClass('border-primary');
    expect(document.activeElement).toBe(input);
  });

  it('Esc fecha o palette', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    await screen.findByRole('combobox');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('prefixo "p:" filtra direto para Processos, consumindo o prefixo do campo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);
    act(() => useCommandPaletteStore.getState().open());

    const input = await screen.findByRole('combobox');
    await user.type(input, 'p:silva');

    await waitFor(() => expect(input).toHaveValue('silva'));
    expect(await screen.findByRole('button', { name: 'Processos' })).toHaveClass('border-primary');
  });
});
