import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { AiChat } from './ai-chat';

describe('AiChat', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra uma dica inicial mencionando o escopo atual', () => {
    renderWithProviders(<AiChat scope={{ tipo: 'PROCESSO', id: 'processo-1' }} />);
    expect(screen.getByText(/este processo/)).toBeInTheDocument();
  });

  it('envia uma pergunta e mostra a resposta com fontes clicáveis', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiChat scope={{ tipo: 'GLOBAL' }} />);

    const input = screen.getByLabelText('Pergunta para o Assistente Jurídico');
    await user.type(input, 'Quais processos têm audiência esta semana?');
    await user.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    expect(await screen.findByText(/Resposta simulada para/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Procuração.pdf' })).toHaveAttribute('href', '/documentos/doc-1');
    expect(screen.getByText('Resposta gerada por IA. Revise antes de utilizar.')).toBeInTheDocument();
  });

  it('não envia pergunta vazia', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiChat scope={{ tipo: 'GLOBAL' }} />);
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
    await user.type(screen.getByLabelText('Pergunta para o Assistente Jurídico'), '   ');
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
  });

  it('limpa o campo após enviar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiChat scope={{ tipo: 'GLOBAL' }} />);
    const input = screen.getByLabelText('Pergunta para o Assistente Jurídico') as HTMLInputElement;
    await user.type(input, 'pergunta');
    await user.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    expect(input.value).toBe('');
  });
});
