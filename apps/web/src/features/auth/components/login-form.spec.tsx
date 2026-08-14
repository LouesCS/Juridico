import { delay, http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { LoginForm } from './login-form';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('LoginForm', () => {
  it('mostra erros de validação quando os campos obrigatórios estão vazios', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(await screen.findByText('Informe sua senha.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('em login bem-sucedido, redireciona para a rota next segura', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'usuaria@quilombo.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('em credenciais inválidas, mostra mensagem sem detalhe técnico', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'usuaria@quilombo.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas.');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('pressionar Enter no campo de senha também envia o formulário', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'usuaria@quilombo.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-correta-123{Enter}');

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('botão fica em loading durante o submit e reabilita ao concluir', async () => {
    server.use(
      http.post(`${env.NEXT_PUBLIC_API_URL}/auth/login`, async () => {
        await delay(100);
        return HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', email: 'usuaria@quilombo.dev' },
          escritorios: [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }],
          escritorioAtivoId: 'mock-office-1',
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'usuaria@quilombo.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-correta-123');

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    await user.click(submitButton);

    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(submitButton).not.toHaveAttribute('aria-busy');
  });

  it('o submit é interceptado pelo React — nunca vira navegação nativa GET com e-mail/senha na URL', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'usuaria@quilombo.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    // form real (RHF) nunca declara method/action — a navegação só pode
    // acontecer via `router.push`, nunca via submit HTML nativo.
    const form = container.querySelector('form')!;
    expect(form).not.toHaveAttribute('method');
    expect(form).not.toHaveAttribute('action');
  });
});
