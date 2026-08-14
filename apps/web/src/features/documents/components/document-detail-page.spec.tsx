import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { DocumentDetailPage } from './document-detail-page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/documentos/doc-1',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('mostra o painel "Relacionados" com links para o Processo e o Cliente do documento (Prompt 11)', async () => {
    renderWithProviders(<DocumentDetailPage documentId="doc-1" />);

    expect(await screen.findByRole('heading', { name: 'Contrato de honorários.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Relacionados')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Processo/ })).toHaveAttribute('href', '/processos/case-1');
    expect(screen.getByRole('link', { name: /Cliente/ })).toHaveAttribute('href', '/clientes/client-1');
    expect(screen.getByRole('link', { name: /Versões/ })).toHaveAttribute('href', '/documentos/doc-1?tab=versoes');
  });
});
