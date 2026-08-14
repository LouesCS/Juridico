import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { ExtrajudicialMovementDetailPage } from './extrajudicial-movement-detail-page';

describe('ExtrajudicialMovementDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });

  it('carrega dados principais, vínculos e tarefas da movimentação correta', async () => {
    renderWithProviders(<ExtrajudicialMovementDetailPage id="extra-1" />);
    expect(
      await screen.findByRole('heading', { name: 'Movimentação extrajudicial' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dados principais')).toBeInTheDocument();
    expect(screen.getByText('Vínculos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MARIA OLIVEIRA/1' })).toHaveAttribute(
      'href',
      '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(screen.getByRole('link', { name: 'Ação de indenização' })).toHaveAttribute(
      'href',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(screen.getByText('Tarefas (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analisar retorno administrativo' })).toHaveAttribute(
      'href',
      '/tarefas/task-extra-1',
    );
  });

  it('preserva a descrição e alterna Ver mais/Ver menos sem nova busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtrajudicialMovementDetailPage id="extra-1" />);
    expect(await screen.findByText(/Recebido em: 11\/08\/2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver mais' }));
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });

  it('expõe Editar, Ações e criação contextual de tarefa conforme permissões', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtrajudicialMovementDetailPage id="extra-1" />);
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ações' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Data da movimentação *')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição *')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cliente')).not.toBeInTheDocument();
  });

  it('oferece timeline, leitura e remoção segura no menu Ações', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExtrajudicialMovementDetailPage id="extra-1" />);
    await user.click(await screen.findByRole('button', { name: 'Ações' }));
    expect(screen.getByText('Lançar tarefa')).toBeInTheDocument();
    expect(screen.getByText('Lançar na timeline da pasta')).toBeInTheDocument();
    expect(screen.getByText('Marcar como lida')).toBeInTheDocument();
    await user.click(screen.getByText('Remover'));
    expect(screen.getByText('Remover movimentação extrajudicial?')).toBeInTheDocument();
  });

  it('apresenta estado de recurso inexistente para 404', async () => {
    renderWithProviders(<ExtrajudicialMovementDetailPage id="missing" />);
    expect(
      await screen.findByText('Movimentação extrajudicial não encontrada.'),
    ).toBeInTheDocument();
  });
});
