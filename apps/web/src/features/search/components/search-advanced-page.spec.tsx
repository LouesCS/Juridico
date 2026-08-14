import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { SearchAdvancedPage } from './search-advanced-page';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('SearchAdvancedPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
    replace.mockClear();
  });

  it('mostra estado inicial pedindo ao menos 2 caracteres', () => {
    renderWithProviders(<SearchAdvancedPage />);
    expect(screen.getByText('Digite ao menos 2 caracteres')).toBeInTheDocument();
  });

  it('busca e agrupa resultados por categoria ao digitar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchAdvancedPage />);

    const input = screen.getByLabelText('Busca avançada');
    await user.type(input, 'silva');

    expect(await screen.findByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Procuração — Silva.pdf')).toBeInTheDocument();
  });

  it('sem resultado mostra empty state explicativo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchAdvancedPage />);

    const input = screen.getByLabelText('Busca avançada');
    await user.type(input, 'zzznadaaqui');

    expect(await screen.findByText(/Nenhum resultado para/)).toBeInTheDocument();
  });
});
