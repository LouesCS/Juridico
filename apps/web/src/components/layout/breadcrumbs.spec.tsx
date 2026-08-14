import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './breadcrumbs';

describe('Breadcrumbs', () => {
  it('renderiza cada nível, com link nos que têm href', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'João Silva', href: '/clientes/joao' },
          { label: 'Processo Trabalhista' },
        ]}
      />,
    );

    const clientesLink = screen.getByRole('link', { name: 'Clientes' });
    expect(clientesLink).toHaveAttribute('href', '/clientes');
    expect(screen.getByRole('link', { name: 'João Silva' })).toHaveAttribute('href', '/clientes/joao');

    const last = screen.getByText('Processo Trabalhista');
    expect(last.tagName).toBe('SPAN');
    expect(last).toHaveAttribute('aria-current', 'page');
  });

  it('não renderiza nada quando a lista está vazia', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca um nível intermediário sem href como texto estático (grupo sem página própria)', () => {
    render(<Breadcrumbs items={[{ label: 'Financeiro' }, { label: 'Contas' }]} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Contas')).toHaveAttribute('aria-current', 'page');
  });
});
