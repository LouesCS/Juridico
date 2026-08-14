import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { RequestDetailPage } from './request-detail-page';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pedidos/request-1',
  useSearchParams: () => new URLSearchParams(),
}));
describe('RequestDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });
  it('mostra dados, vínculos, ações e Audit global', async () => {
    renderWithProviders(<RequestDetailPage id="request-1" />);
    expect(await screen.findByRole('heading', { name: 'Danos morais' })).toBeInTheDocument();
    expect(
      screen.getByText((text) => text.replace(/\s/g, ' ') === 'R$ 81.213,14'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MARIA OLIVEIRA/1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByText('EM_ANDAMENTO')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Auditoria' })).toBeInTheDocument();
  });
});
