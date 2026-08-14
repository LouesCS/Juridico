import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { SidebarContent } from './sidebar-content';

const base = env.NEXT_PUBLIC_API_URL;

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('SidebarContent', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('agrupa a navegação em seções temáticas (Prompt 11)', async () => {
    renderWithProviders(<SidebarContent workspaceSwitcher={null} />);

    expect(await screen.findByText('PESSOAS')).toBeInTheDocument();
    expect(screen.getByText('JURÍDICO')).toBeInTheDocument();
    expect(screen.getByText('GESTÃO DO TEMPO')).toBeInTheDocument();
    expect(screen.getByText('FINANCEIRO')).toBeInTheDocument();
    expect(screen.getByText('OUTROS')).toBeInTheDocument();
    expect(screen.getByText('RELATÓRIOS')).toBeInTheDocument();

    const juridico = screen.getByText('JURÍDICO').closest('div')!;
    expect(within(juridico).getByRole('link', { name: 'Contratos' })).toBeInTheDocument();
    expect(within(juridico).getByRole('link', { name: 'Processos judiciais' })).toBeInTheDocument();
  });

  it('esconde um item sem a permissão exigida (ex.: Assistente IA sem ai:summarize)', async () => {
    renderWithProviders(<SidebarContent workspaceSwitcher={null} />);

    await screen.findByRole('link', { name: 'Dashboard' });
    expect(screen.queryByRole('link', { name: 'Assistente IA' })).not.toBeInTheDocument();
  });

  it('mostra CONFIGURAÇÕES para quem tem configuration:read (Configuration Engine, Prompt 13)', async () => {
    renderWithProviders(<SidebarContent workspaceSwitcher={null} />);

    expect(await screen.findByText('CONFIGURAÇÕES')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Geral' })).toBeInTheDocument();
  });

  it('esconde o grupo CONFIGURAÇÕES inteiro para quem não tem nenhuma permissão do grupo', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ADVOGADO', permissions: ['office:read', 'client:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<SidebarContent workspaceSwitcher={null} />);

    await screen.findByRole('link', { name: 'Dashboard' });
    expect(screen.queryByText('CONFIGURAÇÕES')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Geral' })).not.toBeInTheDocument();
  });

  it('Financeiro (Configurações) exige financeiro:read, independente de configuration:read', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'GESTOR', permissions: ['office:read', 'configuration:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<SidebarContent workspaceSwitcher={null} />);

    expect(await screen.findByRole('link', { name: 'Geral' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
  });
});
