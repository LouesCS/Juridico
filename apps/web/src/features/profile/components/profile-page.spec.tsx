import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  it('aba Segurança mostra estado de indisponibilidade controlada para MFA/OAuth', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('tab', { name: 'Segurança' }));

    expect(
      await screen.findByText('Verificação em duas etapas e login social'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Estes recursos ainda não têm suporte no backend. Ficam pendentes para uma próxima etapa.'),
    ).toBeInTheDocument();
  });
});
