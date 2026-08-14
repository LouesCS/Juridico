import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { useOfficeStore } from '@/stores/office.store';
import { renderWithProviders } from '@/test/render';
import { JudicialMovementDetailPage } from './judicial-movement-detail-page';

describe('JudicialMovementDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });

  it('exibe dados, vínculos, descrição, tarefas, IA e auditoria honesta', async () => {
    renderWithProviders(<JudicialMovementDetailPage id="movement-1" />);
    expect(
      await screen.findByRole('heading', { name: 'Movimentação judicial' }),
    ).toBeInTheDocument();
    for (const heading of [
      'Dados principais',
      'Vínculos',
      'Descrição',
      'Tarefas (1)',
      'Prompts de IA',
      'Auditoria',
    ])
      expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MARIA OLIVEIRA/1' })).toHaveAttribute(
      'href',
      '/pastas/folder-legal-1',
    );
    expect(screen.getByRole('link', { name: '1234567-19.2024.8.26.0001' })).toHaveAttribute(
      'href',
      '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    expect(screen.getByRole('link', { name: 'Analisar intimação' })).toHaveAttribute(
      'href',
      '/tarefas/task-judicial-1',
    );
  });
});
