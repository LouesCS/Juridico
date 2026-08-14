import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModulePlaceholderPage } from './module-placeholder-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

describe('ModulePlaceholderPage', () => {
  it('mostra a trilha de breadcrumb e o aviso "Em desenvolvimento" para uma rota da nova Sidebar', () => {
    render(
      <ModulePlaceholderPage
        title="Contratos"
        description="Contratos vinculados a clientes e processos aparecerão aqui quando o módulo Contratos for implementado."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Contratos' }]}
      />,
    );

    expect(screen.getByText('Jurídico')).toBeInTheDocument();
    expect(screen.getAllByText('Contratos').length).toBeGreaterThan(0);
    expect(screen.getByText('Em desenvolvimento')).toBeInTheDocument();
  });
});
