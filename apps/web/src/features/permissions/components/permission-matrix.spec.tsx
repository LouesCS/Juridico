import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PermissionMatrix } from './permission-matrix';
import type { PermissionCatalogItem } from '../api/permissions.api';

const CATALOG: PermissionCatalogItem[] = [
  { id: '1', chave: 'client:read', recurso: 'client', acao: 'read', escopo: 'ALL', categoria: 'Clientes', descricao: 'Visualizar clientes' },
  { id: '2', chave: 'case:delete', recurso: 'case', acao: 'delete', escopo: 'ALL', categoria: 'Processos', descricao: 'Excluir processo' },
];

function renderMatrix(props: Partial<React.ComponentProps<typeof PermissionMatrix>> = {}) {
  const onChange = vi.fn();
  render(
    <TooltipProvider>
      <PermissionMatrix
        catalog={CATALOG}
        value={[]}
        onChange={onChange}
        atorPermissions={['client:read']}
        {...props}
      />
    </TooltipProvider>,
  );
  return { onChange };
}

describe('PermissionMatrix', () => {
  it('agrupa os itens por categoria', () => {
    renderMatrix();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Processos')).toBeInTheDocument();
  });

  it('marcar um checkbox chama onChange com a chave adicionada', async () => {
    const user = userEvent.setup();
    const { onChange } = renderMatrix();

    await user.click(screen.getByRole('checkbox', { name: 'Visualizar clientes' }));

    expect(onChange).toHaveBeenCalledWith(['client:read']);
  });

  it('desmarcar um checkbox já selecionado remove a chave', async () => {
    const user = userEvent.setup();
    const { onChange } = renderMatrix({ value: ['client:read'] });

    await user.click(screen.getByRole('checkbox', { name: 'Visualizar clientes' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('desabilita (teto de privilégio) uma permissão que o ator não possui', () => {
    renderMatrix({ atorPermissions: ['client:read'] });

    expect(screen.getByRole('checkbox', { name: 'Excluir processo' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Visualizar clientes' })).toBeEnabled();
  });
});
