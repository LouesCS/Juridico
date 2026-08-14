import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { SessionsList } from './sessions-list';

describe('SessionsList', () => {
  it('lista as sessões reais de GET /auth/sessions, marcando a atual', async () => {
    renderWithProviders(<SessionsList />);

    expect(await screen.findByText('Chrome · Windows')).toBeInTheDocument();
    expect(screen.getByText('Safari · iPhone')).toBeInTheDocument();
    expect(screen.getByText('Sessão atual')).toBeInTheDocument();
  });

  it('não mostra ação de encerrar para a sessão atual', async () => {
    renderWithProviders(<SessionsList />);
    await screen.findByText('Chrome · Windows');

    const currentRow = screen.getByText('Chrome · Windows').closest('tr')!;
    expect(currentRow.querySelector('button')).toBeNull();
  });

  it('revoga uma sessão que não é a atual', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SessionsList />);

    await screen.findByText('Safari · iPhone');
    const otherRow = screen.getByText('Safari · iPhone').closest('tr')!;
    await user.click(otherRow.querySelector('button')!);
    await user.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(screen.queryByText('Safari · iPhone')).not.toBeInTheDocument());
  });

  it('"encerrar todas" fica desabilitado — endpoint não existe no backend real', async () => {
    renderWithProviders(<SessionsList />);
    await screen.findByText('Chrome · Windows');

    expect(screen.getByRole('button', { name: 'Encerrar todas as outras' })).toBeDisabled();
  });
});
