import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { WorkspaceSwitcher } from './workspace-switcher';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    pushMock.mockClear();
  });

  it('mostra só o nome, sem dropdown, quando há um único escritório (§7.6)', () => {
    useOfficeStore
      .getState()
      .hydrateFromLogin('office-1', [{ id: 'office-1', nome: 'Escritório Único', papel: 'OWNER' }]);

    renderWithProviders(<WorkspaceSwitcher />);

    expect(screen.getByText('Escritório Único')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('troca de escritório com sucesso: redireciona para o dashboard', async () => {
    const user = userEvent.setup();
    useOfficeStore.getState().hydrateFromLogin('office-1', [
      { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
      { id: 'office-2', nome: 'Escritório B', papel: 'ADVOGADO' },
    ]);

    renderWithProviders(<WorkspaceSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Trocar de escritório' }));
    await user.click(await screen.findByText('Escritório B'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('troca para escritório revogado (403): mostra erro e não redireciona', async () => {
    const user = userEvent.setup();
    useOfficeStore.getState().hydrateFromLogin('office-1', [
      { id: 'office-1', nome: 'Escritório A', papel: 'OWNER' },
      { id: 'mock-office-revogado', nome: 'Escritório Revogado', papel: 'ADVOGADO' },
    ]);

    renderWithProviders(<WorkspaceSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Trocar de escritório' }));
    await user.click(await screen.findByText('Escritório Revogado'));

    await waitFor(() =>
      expect(useOfficeStore.getState().escritorios.map((o) => o.id)).toEqual(['office-1']),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
