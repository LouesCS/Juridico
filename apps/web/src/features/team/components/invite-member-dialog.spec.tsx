import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { InviteMemberDialog } from './invite-member-dialog';

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('convite válido: envia e fecha o modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberDialog />);

    await user.click(screen.getByRole('button', { name: 'Convidar membro' }));
    await user.type(screen.getByLabelText('E-mail'), 'nova@quilombo.dev');
    await user.click(screen.getByRole('combobox', { name: 'Papel' }));
    await user.click(await screen.findByRole('option', { name: 'ADVOGADO' }));
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Enviar convite' })).not.toBeInTheDocument(),
    );
  });

  it('erro 422 do backend: mapeia para o campo de e-mail', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberDialog />);

    await user.click(screen.getByRole('button', { name: 'Convidar membro' }));
    await user.type(screen.getByLabelText('E-mail'), 'bloqueado@quilombo.dev');
    await user.click(screen.getByRole('combobox', { name: 'Papel' }));
    await user.click(await screen.findByRole('option', { name: 'ADVOGADO' }));
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('Este e-mail não pode ser convidado.')).toBeInTheDocument();
  });
});
