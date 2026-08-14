import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { PermissionsAdminPage } from './permissions-admin-page';

const base = env.NEXT_PUBLIC_API_URL;

async function createCustomRole(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.click(await screen.findByRole('button', { name: 'Novo perfil' }));
  await user.type(await screen.findByLabelText('Nome'), nome);
  await user.click(await screen.findByRole('checkbox', { name: 'Visualizar clientes' }));
  await user.click(screen.getByRole('button', { name: 'Criar perfil' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('PermissionsAdminPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista os perfis e mostra a matriz de permissões do selecionado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsAdminPage />);

    await user.click(await screen.findByRole('button', { name: /ADVOGADO/ }));

    expect(await screen.findByRole('heading', { name: 'ADVOGADO' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Visualizar clientes' })).toBeChecked();
  });

  it('perfil de sistema: a matriz aparece desabilitada e sem botão de excluir', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsAdminPage />);

    await user.click(await screen.findByRole('button', { name: /ADVOGADO/ }));
    await screen.findByRole('heading', { name: 'ADVOGADO' });

    expect(screen.getByRole('checkbox', { name: 'Visualizar clientes' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Excluir ADVOGADO/ })).not.toBeInTheDocument();
  });

  it('cria um perfil customizado com as permissões escolhidas e permite editá-lo depois', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsAdminPage />);

    await createCustomRole(user, 'Financeiro Júnior');

    expect(await screen.findByRole('button', { name: /Financeiro Júnior/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Financeiro Júnior/ }));
    await screen.findByRole('heading', { name: 'Financeiro Júnior' });

    // Perfil recém-criado (customizado) — checkbox editável, botão de excluir presente.
    expect(screen.getByRole('checkbox', { name: 'Visualizar clientes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Excluir Financeiro Júnior/ })).toBeInTheDocument();
  });

  it('salva alterações na matriz de um perfil customizado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsAdminPage />);

    await createCustomRole(user, 'Perfil Editável');
    await user.click(await screen.findByRole('button', { name: /Perfil Editável/ }));
    await screen.findByRole('heading', { name: 'Perfil Editável' });

    // Ao criar, marcou "Visualizar clientes" — desmarcar conta como alteração pendente.
    await user.click(screen.getByRole('checkbox', { name: 'Visualizar clientes' }));
    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument(),
    );
  });

  it('bloqueia excluir um perfil atribuído a membros (ROLE_IN_USE)', async () => {
    server.use(
      http.delete(`${base}/roles/:id`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'ROLE_IN_USE',
            status: 409,
            detail: 'Perfil em uso.',
            code: 'ROLE_IN_USE',
            correlationId: 'x',
            timestamp: new Date(0).toISOString(),
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<PermissionsAdminPage />);

    await createCustomRole(user, 'Perfil Em Uso');
    await user.click(await screen.findByRole('button', { name: /Perfil Em Uso/ }));
    await screen.findByRole('heading', { name: 'Perfil Em Uso' });

    await user.click(screen.getByRole('button', { name: /Excluir Perfil Em Uso/ }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    // Sem `<Toaster/>` montado neste teste, a evidência observável do
    // ROLE_IN_USE é a mutation falhar sem remover o perfil: o
    // `ConfirmDialog` não fecha em erro (só em sucesso — ver
    // `RoleDeleteDialog`), então continua aberto e habilitado.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('não mostra mais a aba IA (Sprint 13 moveu para /configuracoes/ia)', async () => {
    renderWithProviders(<PermissionsAdminPage />);

    await screen.findByRole('tab', { name: 'Perfis e Permissões' });
    expect(screen.queryByRole('tab', { name: 'IA' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Simulador' })).toBeInTheDocument();
  });
});
