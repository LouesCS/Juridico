import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { FinancialSettingsPage } from './financial-settings-page';

const base = env.NEXT_PUBLIC_API_URL;

describe('FinancialSettingsPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('OWNER (configuration:manage) vê e usa o botão Salvar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FinancialSettingsPage />);

    const dias = await screen.findByLabelText('Dias para vencimento padrão');
    expect(dias).toBeEnabled();

    await user.clear(dias);
    await user.type(dias, '45');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(dias).toHaveValue(45));
  });

  it('sem configuration:manage, o botão Salvar fica ausente e os campos somente leitura', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'FINANCEIRO', permissions: ['office:read', 'financeiro:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<FinancialSettingsPage />);

    const dias = await screen.findByLabelText('Dias para vencimento padrão');
    expect(dias).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });
});
