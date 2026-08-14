import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { AcceptInvitationForm } from './accept-invitation-form';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

describe('AcceptInvitationForm', () => {
  it('convite inválido: mostra mensagem neutra (mesmo NOT_FOUND do backend real)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitationForm token="token-invalido" />);

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este convite não é válido. Peça para quem convidou enviar um novo.',
    );
  });

  it('convite expirado: mesma mensagem neutra, sem revelar que expirou especificamente', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitationForm token="token-expirado" />);

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este convite não é válido. Peça para quem convidou enviar um novo.',
    );
  });

  it('convite já aceito: idempotente, redireciona para login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitationForm token="token-ja-aceito" />);

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
  });
});
