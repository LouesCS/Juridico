import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { CaseTimeline } from './case-timeline';

describe('CaseTimeline', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra os eventos reais agrupados e o card de IA como placeholder elegante', async () => {
    renderWithProviders(<CaseTimeline processoId="case-1" />);

    expect(await screen.findByText(/Processo "Ação de cobrança/)).toBeInTheDocument();
    expect(screen.getByText('Status alterado de ATIVO para SUSPENSO')).toBeInTheDocument();
    expect(screen.getByText('Resumo Inteligente')).toBeInTheDocument();
    expect(screen.getByText('IA ainda não integrada')).toBeInTheDocument();
  });

  it('filtra por categoria (Sistema mostra só eventos automáticos)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CaseTimeline processoId="case-1" />);

    await screen.findByText(/Processo "Ação de cobrança/);
    await user.click(screen.getByRole('button', { name: 'Comentários' }));

    await waitFor(() => expect(screen.queryByText(/Processo "Ação de cobrança/)).not.toBeInTheDocument());
    expect(screen.getByText('Nenhum evento ainda')).toBeInTheDocument();
  });

  it('adiciona uma anotação manual à timeline', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CaseTimeline processoId="case-1" />);

    await screen.findByText(/Processo "Ação de cobrança/);
    await user.type(screen.getByPlaceholderText('Adicionar uma anotação a esta timeline...'), 'Liguei para o cliente');
    await user.click(screen.getByRole('button', { name: 'Anotar' }));

    expect(await screen.findByText('Liguei para o cliente')).toBeInTheDocument();
  });

  it('busca eventos por texto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CaseTimeline processoId="case-1" />);

    await screen.findByText(/Processo "Ação de cobrança/);
    await user.type(screen.getByLabelText('Buscar na timeline'), 'Status alterado');

    await waitFor(() => expect(screen.queryByText(/Processo "Ação de cobrança/)).not.toBeInTheDocument());
    expect(screen.getByText('Status alterado de ATIVO para SUSPENSO')).toBeInTheDocument();
  });
});
