import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { RequestFormDialog } from './request-form-dialog';

const pasta = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', nome: 'MARIA OLIVEIRA/1' };
describe('RequestFormDialog', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Mock', papel: 'OWNER' }]);
  });
  it('exibe os dois tipos e mantém apenas um selecionado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RequestFormDialog pasta={pasta} processos={[]} />);
    await user.click(screen.getByRole('button', { name: 'Novo Pedido' }));
    expect(screen.getByText('Identificação')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Situação' })).toHaveTextContent('Em andamento');
    const judicial = await screen.findByRole('combobox', { name: 'Processo judicial' });
    const extrajudicial = screen.getByRole('combobox', { name: 'Processo extrajudicial' });
    await user.click(judicial);
    await user.click(await screen.findByText(/CNJ 1234567/));
    expect(judicial).toHaveTextContent('CNJ 1234567');
    expect(judicial).toHaveClass('h-9', 'min-w-0', 'overflow-hidden');
    expect(judicial.querySelector('svg')).toHaveClass('shrink-0');
    await user.hover(judicial);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'CNJ 1234567-19.2024.8.26.0001 — Ação de indenização por danos morais e materiais decorrentes de acidente',
    );
    expect(extrajudicial).toHaveTextContent('Nenhum');
    await user.click(extrajudicial);
    await user.click(await screen.findByText(/Procedimento administrativo previdenciário/));
    expect(extrajudicial).toHaveTextContent('Procedimento administrativo previdenciário');
    expect(extrajudicial).toHaveClass('h-9', 'min-w-0', 'overflow-hidden');
    expect(judicial).toHaveTextContent('Nenhum');
  });
});
