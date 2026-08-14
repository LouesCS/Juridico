import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  it('não mostra "Limpar filtros" quando não há filtros ativos', () => {
    render(
      <FilterBar activeCount={0} onClear={vi.fn()}>
        <span>filtro</span>
      </FilterBar>,
    );

    expect(screen.queryByRole('button', { name: /Limpar filtros/ })).not.toBeInTheDocument();
  });

  it('mostra a contagem de filtros ativos e limpa ao clicar', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <FilterBar activeCount={2} onClear={onClear}>
        <span>filtro</span>
      </FilterBar>,
    );

    expect(screen.getByText('2 filtros ativos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Limpar filtros/ }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('continua funcionando sem os props novos (retrocompatível)', () => {
    render(
      <FilterBar>
        <span>filtro</span>
      </FilterBar>,
    );

    expect(screen.getByText('filtro')).toBeInTheDocument();
  });
});
