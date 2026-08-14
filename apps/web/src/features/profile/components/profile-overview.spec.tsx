import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ProfileOverview } from './profile-overview';

describe('ProfileOverview', () => {
  it('mostra os dados reais de GET /me e preserva as demais informações do perfil', async () => {
    renderWithProviders(<ProfileOverview />);

    expect(await screen.findByText('Usuária Mock')).toBeInTheDocument();
    expect(screen.getByText('usuaria@quilombo.dev')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
    expect(screen.getByText('Escritório Mock')).toBeInTheDocument();
    expect(screen.getByText('pt-BR')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preferências' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tema')).toHaveTextContent('Sistema');
  });

  it('mostra aviso de indisponibilidade da edição de perfil — não simula um formulário de edição', async () => {
    renderWithProviders(<ProfileOverview />);

    expect(await screen.findByText('Edição de perfil ainda não disponível')).toBeInTheDocument();
  });
});
