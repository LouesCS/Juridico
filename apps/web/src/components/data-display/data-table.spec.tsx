import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { DataTable } from './data-table';

describe('DataTable', () => {
  it('usa uma única superfície delimitada com header integrado', () => {
    renderWithProviders(
      <DataTable
        columns={[
          { key: 'name', header: 'Nome', render: (row: { id: string; name: string }) => row.name },
        ]}
        data={[{ id: '1', name: 'Registro' }]}
        rowKey={(row) => row.id}
      />,
    );
    const surface = screen.getByRole('table').closest('[data-slot="data-table-surface"]');
    expect(surface).toHaveAttribute('data-slot', 'data-table-surface');
    expect(surface).toHaveClass('border', 'rounded-lg', 'overflow-x-auto');
  });
  it('mantém o estado vazio dentro da mesma superfície', () => {
    renderWithProviders(
      <DataTable columns={[]} data={[]} rowKey={() => ''} emptyState={<p>Sem registros</p>} />,
    );
    expect(
      screen.getByText('Sem registros').closest('[data-slot="data-table-surface"]'),
    ).toBeInTheDocument();
  });
});
