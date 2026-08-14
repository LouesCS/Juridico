import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { DashboardPage } from './dashboard-page';

const base = env.NEXT_PUBLIC_API_URL;

describe('DashboardPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('renderiza a saudação com o escritório ativo e os cards reais e mockados', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Olá, Usuária')).toBeInTheDocument();
    expect(screen.getByText('Escritório Mock')).toBeInTheDocument();
    expect((await screen.findAllByText('Contestação')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mock').length).toBeGreaterThan(0);
    // "Meus Processos" (Legal Cases, real desde o Prompt 7) soma-se ao selo
    // "Dados reais" já existente de outro card — múltiplas ocorrências.
    expect((await screen.findAllByText('Dados reais')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Ação de cobrança — Silva vs. Acme')).length).toBeGreaterThan(0);
  });

  it('seção vazia: card mostra EmptyState quando GET /legal-cases retorna lista vazia', async () => {
    server.use(http.get(`${base}/legal-cases`, () => HttpResponse.json({ items: [], nextCursor: null })));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Nenhum processo ainda')).toBeInTheDocument();
  });

  it('erro parcial: falha num card não bloqueia os demais', async () => {
    server.use(
      http.get(`${base}/deadlines`, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'INTERNAL_ERROR', status: 500, detail: 'Erro', code: 'INTERNAL_ERROR', correlationId: 'mock' },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect((await screen.findAllByText('Ação de cobrança — Silva vs. Acme')).length).toBeGreaterThan(0);
  });

  it('loading parcial: mostra skeleton enquanto um endpoint específico ainda não respondeu', async () => {
    server.use(
      http.get(`${base}/legal-cases`, async () => {
        await delay(100);
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );

    renderWithProviders(<DashboardPage />);

    expect((await screen.findAllByText('Contestação')).length).toBeGreaterThan(0);
    const casesHeading = screen.getByText('Meus Processos');
    const casesCard = casesHeading.closest('div')?.parentElement;
    expect(casesCard?.querySelector('[class*="animate-pulse"]')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Nenhum processo ainda')).toBeInTheDocument());
  });

  it('sem permissão member:read: card de Equipe não aparece', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ASSISTENTE', permissions: ['office:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<DashboardPage />);

    await screen.findAllByText('Contestação');
    expect(screen.queryByText('Equipe')).not.toBeInTheDocument();
  });

  it('sem report:metrics:read: card de Métricas de Carteira não aparece (Permission Engine, Prompt 12)', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ADVOGADO', permissions: ['office:read', 'member:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<DashboardPage />);

    await screen.findAllByText('Contestação');
    expect(screen.queryByText('Métricas de Carteira')).not.toBeInTheDocument();
  });

  it('com report:metrics:read (independente do nome do papel): card de Métricas de Carteira aparece', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Usuária', sobrenome: 'Mock', email: 'usuaria@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: {
            id: 'mock-membro-1',
            papel: 'GESTOR',
            permissions: ['office:read', 'report:metrics:read'],
          },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Métricas de Carteira')).toBeInTheDocument();
  });
});
