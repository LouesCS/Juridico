import { Scale, FileSignature } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedPanel } from './related-panel';

describe('RelatedPanel', () => {
  it('renderiza itens clicáveis com contagem', () => {
    render(
      <RelatedPanel
        items={[{ label: 'Processos', icon: Scale, href: '/clientes/1?tab=processos', count: 3 }]}
      />,
    );

    const link = screen.getByRole('link', { name: /Processos/ });
    expect(link).toHaveAttribute('href', '/clientes/1?tab=processos');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('mostra um item sem módulo implementado como não clicável, nunca escondido', () => {
    render(<RelatedPanel items={[{ label: 'Contratos', icon: FileSignature }]} />);

    expect(screen.queryByRole('link', { name: /Contratos/ })).not.toBeInTheDocument();
    const disabled = screen.getByText('Contratos').closest('[aria-disabled="true"]');
    expect(disabled).toBeInTheDocument();
  });

  it('não renderiza o card quando não há itens', () => {
    const { container } = render(<RelatedPanel items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
