import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { ClientDetailPage } from './client-detail-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/clientes/client-1',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ClientDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('mostra apenas relações funcionais e as abas finais do Cliente', async () => {
    renderWithProviders(<ClientDetailPage clientId="client-1" />);

    expect(await screen.findByRole('heading', { name: 'João da Silva' })).toBeInTheDocument();
    const relatedPanel = screen.getByText('Relacionados').closest('div')!.parentElement!;

    // Papéis diferentes (link vs. tab) evitam colisão com o TabsTrigger de
    // mesmo nome — só o painel "Relacionados" produz um `link`.
    expect(within(relatedPanel).getByRole('link', { name: /Processos/ })).toBeInTheDocument();
    expect(within(relatedPanel).getByRole('link', { name: /Pastas/ })).toBeInTheDocument();
    expect(within(relatedPanel).getByRole('link', { name: /Anexos/ })).toBeInTheDocument();
    for (const tab of ['Pastas', 'Prompts de IA', 'Anexos', 'Auditoria de atividades']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
    for (const removed of ['Comentários', 'Contratos', 'Financeiro']) {
      expect(screen.queryByRole('tab', { name: removed })).not.toBeInTheDocument();
      expect(within(relatedPanel).queryByText(removed)).not.toBeInTheDocument();
    }
  });

  it('oferece Nova Pasta contextual sem criação direta de Processo', async () => {
    renderWithProviders(<ClientDetailPage clientId="client-1" />);

    await screen.findByRole('heading', { name: 'João da Silva' });
    expect(screen.getByRole('link', { name: 'Nova Pasta' })).toHaveAttribute(
      'href',
      '/pastas?nova=1&clienteId=client-1',
    );
    expect(screen.queryByRole('button', { name: 'Novo processo' })).not.toBeInTheDocument();
  });
});
