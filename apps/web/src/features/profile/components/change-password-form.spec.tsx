import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { ChangePasswordForm } from './change-password-form';

describe('ChangePasswordForm', () => {
  it('validação: senha nova curta e confirmação divergente mostram erro', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Senha atual'), 'senha-atual-123');
    await user.type(screen.getByLabelText('Nova senha'), 'curta');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outra-coisa');
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(await screen.findByText('A senha deve ter ao menos 12 caracteres.')).toBeInTheDocument();
  });

  it('erro do backend: senha atual incorreta (INVALID_CREDENTIALS) mapeia para o campo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Senha atual'), 'senha-errada-123');
    await user.type(screen.getByLabelText('Nova senha'), 'nova-senha-com-12-chars');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'nova-senha-com-12-chars');
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument();
  });

  it('sucesso: limpa o formulário', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('Senha atual'), 'senha-atual-123');
    await user.type(screen.getByLabelText('Nova senha'), 'nova-senha-com-12-chars');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'nova-senha-com-12-chars');
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(await screen.findByLabelText('Senha atual')).toHaveValue('');
  });
});
