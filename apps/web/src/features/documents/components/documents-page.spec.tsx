import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { DocumentsPage } from './documents-page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe('DocumentsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista os documentos reais de GET /documents em modo grid por padrão', async () => {
    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByText('Contrato de honorários.pdf')).toBeInTheDocument();
    expect(screen.getByText('Procuração.docx')).toBeInTheDocument();
  });

  it('filtra documentos pela busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsPage />);

    await screen.findByText('Contrato de honorários.pdf');
    await user.type(screen.getByLabelText('Pesquisar documentos'), 'Procuração');

    await waitFor(() => expect(screen.queryByText('Contrato de honorários.pdf')).not.toBeInTheDocument());
    expect(await screen.findByText('Procuração.docx')).toBeInTheDocument();
  });

  it('troca para o modo lista', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsPage />);

    await screen.findByText('Contrato de honorários.pdf');
    await user.click(screen.getByRole('button', { name: 'Modo lista' }));

    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
  });

  it('mostra as visões (Todos, Recentes, Favoritos, Versionados, Compartilhados, Lixeira)', async () => {
    renderWithProviders(<DocumentsPage />);

    await screen.findByText('Contrato de honorários.pdf');
    expect(screen.getByRole('tab', { name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lixeira' })).toBeInTheDocument();
  });

  it('a visão "Compartilhados" mostra o placeholder honesto de indisponibilidade', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsPage />);

    await screen.findByText('Contrato de honorários.pdf');
    await user.click(screen.getByRole('tab', { name: 'Compartilhados' }));

    expect(await screen.findByText('Compartilhamento externo ainda não disponível')).toBeInTheDocument();
  });
});
