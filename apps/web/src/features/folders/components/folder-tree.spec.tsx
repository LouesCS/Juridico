import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { FolderTree } from './folder-tree';

describe('FolderTree', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista as pastas reais de GET /folders, agrupadas em árvore', async () => {
    renderWithProviders(<FolderTree activeId={null} onSelect={vi.fn()} />);

    expect(await screen.findByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Procurações')).toBeInTheDocument();
  });

  it('mostra a subpasta de uma pasta raiz (expandida por padrão) e recolhe ao clicar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree activeId={null} onSelect={vi.fn()} />);

    await screen.findByText('Contratos');
    expect(await screen.findByText('2026')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recolher Contratos' }));

    expect(screen.queryByText('2026')).not.toBeInTheDocument();
  });

  it('chama onSelect ao clicar em "Todos os documentos"', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(<FolderTree activeId="pasta-1" onSelect={onSelect} />);

    await screen.findByText('Contratos');
    await user.click(screen.getByRole('button', { name: 'Todos os documentos' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
