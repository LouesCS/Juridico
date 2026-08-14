import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { ConfigurationRouteGuard } from './configuration-route-guard';

const base = env.NEXT_PUBLIC_API_URL;
const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

describe('ConfigurationRouteGuard', () => {
  beforeEach(() => {
    replace.mockClear();
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('renderiza o conteúdo e a trilha de breadcrumb quando o usuário tem a permissão exigida', async () => {
    renderWithProviders(
      <ConfigurationRouteGuard title="Feriados" requiredPermissions={['configuration:read']}>
        <p>Conteúdo de Feriados</p>
      </ConfigurationRouteGuard>,
    );

    expect(await screen.findByText('Conteúdo de Feriados')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Feriados' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redireciona para "/" quando falta a permissão exigida', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ADVOGADO', permissions: ['office:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(
      <ConfigurationRouteGuard title="Feriados" requiredPermissions={['configuration:read']}>
        <p>Conteúdo de Feriados</p>
      </ConfigurationRouteGuard>,
    );

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText('Conteúdo de Feriados')).not.toBeInTheDocument();
  });
});
