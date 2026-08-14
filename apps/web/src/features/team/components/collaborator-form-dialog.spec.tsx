import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { useCollaborator } from '../api/queries';
import { collaboratorsApi } from '../api/collaborators.api';
import { CollaboratorFormDialog } from './collaborator-form-dialog';

/** Mesma ponte de `EditClientBridge`/`EditHarness` de Clientes — busca o
 * `CollaboratorDetailDTO` completo (não o resumo da listagem) antes de
 * abrir o formulário. */
function EditHarness({ collaboratorId, onClose }: { collaboratorId: string; onClose: () => void }) {
  const { data: collaborator } = useCollaborator(collaboratorId);
  return (
    <CollaboratorFormDialog
      collaborator={collaborator}
      open={!!collaborator}
      onOpenChange={(open) => !open && onClose()}
    />
  );
}

describe('CollaboratorFormDialog', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('Novo colaborador reutiliza o mesmo schema/estrutura de abas do Editar', async () => {
    renderWithProviders(<CollaboratorFormDialog open onOpenChange={() => {}} />);

    expect(await screen.findByRole('heading', { name: 'Novo colaborador' })).toBeInTheDocument();
    for (const tab of ['Dados pessoais', 'Contato', 'Dados profissionais', 'Acesso ao sistema']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });

  it('checkbox "Permitir acesso ao sistema" só aparece habilitado na criação — no Editar mostra situação read-only', async () => {
    renderWithProviders(<EditHarness collaboratorId="collab-ana" onClose={() => {}} />);

    await screen.findByRole('heading', { name: 'Editar colaborador' });
    await userEvent.click(screen.getByRole('tab', { name: 'Acesso ao sistema' }));

    expect(screen.queryByRole('checkbox', { name: /Permitir acesso ao sistema/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Situação de acesso atual/)).toBeInTheDocument();
    expect(screen.getByText('Desbloqueado')).toBeInTheDocument();
  });

  it('na criação, marcar "Permitir acesso ao sistema" revela o seletor de Papel e exige seleção', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollaboratorFormDialog open onOpenChange={() => {}} />);

    await screen.findByRole('heading', { name: 'Novo colaborador' });
    await user.click(screen.getByRole('tab', { name: 'Acesso ao sistema' }));

    expect(screen.queryByLabelText('Papel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    expect(await screen.findByText('Papel')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Dados pessoais' }));
    await user.type(await screen.findByLabelText('Nome completo'), 'Novo Colaborador');
    await user.click(screen.getByRole('tab', { name: 'Contato' }));
    await user.type(screen.getByLabelText('E-mail'), 'novo.colaborador@exemplo.com');
    await user.click(screen.getByRole('tab', { name: 'Acesso ao sistema' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar colaborador' }));

    expect(await screen.findByText('Selecione um papel para conceder acesso ao sistema.')).toBeInTheDocument();
  });

  it('carrega CPF, cargo, celular e dados de OAB já preenchidos ao editar', async () => {
    renderWithProviders(<EditHarness collaboratorId="collab-ana" onClose={() => {}} />);

    await screen.findByRole('heading', { name: 'Editar colaborador' });
    expect(screen.getByLabelText('CPF')).toHaveValue('52998224725');

    await userEvent.click(screen.getByRole('tab', { name: 'Contato' }));
    expect(screen.getByLabelText('Celular')).toHaveValue('11988880001');

    await userEvent.click(screen.getByRole('tab', { name: 'Dados profissionais' }));
    expect(screen.getByRole('combobox', { name: 'Cargo' })).toHaveTextContent('Advogado Sênior');
    expect(screen.getByLabelText('Número OAB')).toHaveValue('123456');
    expect(screen.getByLabelText('UF OAB')).toHaveValue('SP');
  });

  it('edita o cargo e persiste via PATCH', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderWithProviders(<EditHarness collaboratorId="collab-bruno" onClose={() => (closed = true)} />);

    await screen.findByRole('heading', { name: 'Editar colaborador' });
    await user.click(screen.getByRole('tab', { name: 'Dados profissionais' }));
    await user.click(screen.getByRole('combobox', { name: 'Cargo' }));
    await user.click(await screen.findByRole('option', { name: 'Advogado Sênior' }));

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(closed).toBe(true));
    const updated = await collaboratorsApi.get('collab-bruno');
    expect(updated.cargo?.nome).toBe('Advogado Sênior');
  });

  it('mantém o DialogContent no mesmo esqueleto (header fixo/corpo rolável/footer fixo) de Clientes', async () => {
    renderWithProviders(<EditHarness collaboratorId="collab-ana" onClose={() => {}} />);

    const dialog = await screen.findByRole('dialog');
    const heading = within(dialog).getByRole('heading', { name: 'Editar colaborador' });
    const submitButton = within(dialog).getByRole('button', { name: 'Salvar alterações' });
    const scrollArea = within(dialog).getByRole('tablist').closest('[class*="overflow-y-auto"]');

    expect(dialog.className).toContain('max-h-[85vh]');
    expect(dialog.className).not.toContain('overflow-y-auto');
    expect(scrollArea).not.toBeNull();
    expect(scrollArea?.contains(heading)).toBe(false);
    expect(scrollArea?.contains(submitButton)).toBe(false);
  });
});
