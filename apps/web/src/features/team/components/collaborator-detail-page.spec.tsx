import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { CollaboratorDetailPage } from './collaborator-detail-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/colaboradores/collab-ana',
  useSearchParams: () => new URLSearchParams(),
}));

const base = env.NEXT_PUBLIC_API_URL;

describe('CollaboratorDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('renderiza todas as abas especificadas', async () => {
    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-ana" />);

    await screen.findByRole('heading', { name: 'Ana Beatriz Souza' });
    for (const tab of [
      'Resumo',
      'Dados pessoais',
      'Contato',
      'Endereço',
      'Dados profissionais',
      'OAB',
      'Acesso ao sistema',
      'Permissões',
      'Grupos',
      'Sessões',
      'Processos',
      'Tarefas',
      'Serviços',
      'Registros de Trabalho',
      'Timeline',
      'Auditoria',
    ]) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });

  it('mostra placeholder "Em breve" para módulos ainda não implementados (Processos/Tarefas/Timeline/Auditoria)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-ana" />);

    await screen.findByRole('heading', { name: 'Ana Beatriz Souza' });

    await user.click(screen.getByRole('tab', { name: 'Processos' }));
    expect(await screen.findByText('Em breve')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Auditoria' }));
    expect(await screen.findByText('Em breve')).toBeInTheDocument();
  });

  it('Resumo mostra cargo, papel e situação de acesso reais', async () => {
    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-ana" />);

    await screen.findByRole('heading', { name: 'Ana Beatriz Souza' });
    expect(screen.getByText('Advogado Sênior')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
    // "Desbloqueado" aparece tanto no badge do cabeçalho quanto no resumo —
    // duplicação intencional (ver linhas 193/261 de `collaborator-detail-page.tsx`).
    expect(screen.getAllByText('Desbloqueado').length).toBeGreaterThan(0);
  });

  it('colaborador sem acesso (Elisa Martins) mostra "Permitir acesso ao sistema" e não mostra ações de bloquear/suspender', async () => {
    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-elisa" />);

    await screen.findByRole('heading', { name: 'Elisa Martins' });
    expect(screen.getByRole('button', { name: 'Permitir acesso ao sistema' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
  });

  it('OWNER (permissões completas) vê as ações rápidas de gestão de acesso', async () => {
    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-bruno" />);

    await screen.findByRole('heading', { name: 'Bruno Lima Costa' });
    const quickActions = screen.getByText('Ações rápidas').closest('div')!.parentElement!;
    expect(within(quickActions).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(within(quickActions).getByRole('button', { name: 'Configurar permissões' })).toBeInTheDocument();
    // Bruno está BLOQUEADO — a ação disponível é "Desbloquear", não "Bloquear".
    expect(within(quickActions).getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument();
    expect(within(quickActions).getByRole('button', { name: 'Revogar sessões' })).toBeInTheDocument();
  });

  it('usuário só com member:read não vê nenhuma ação de mutação no card "Ações rápidas"', async () => {
    server.use(
      http.get(`${base}/me`, () =>
        HttpResponse.json({
          usuario: { id: 'mock-user-1', nome: 'Leitor', sobrenome: 'Mock', email: 'leitor@quilombo.dev', avatarUrl: null, tema: null, idioma: null },
          membro: { id: 'mock-membro-1', papel: 'ASSISTENTE', permissions: ['office:read', 'member:read'] },
          escritorio: { id: 'mock-office-1', nome: 'Escritório Mock', slug: 'escritorio-mock' },
        }),
      ),
    );

    renderWithProviders(<CollaboratorDetailPage collaboratorId="collab-bruno" />);

    await screen.findByRole('heading', { name: 'Bruno Lima Costa' });
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configurar permissões' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desbloquear' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revogar sessões' })).not.toBeInTheDocument();
  });
});
