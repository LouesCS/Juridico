import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { HolidaysPage } from './holidays-page';

describe('HolidaysPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('lista o feriado já cadastrado', async () => {
    renderWithProviders(<HolidaysPage />);
    expect(await screen.findByText('Natal')).toBeInTheDocument();
  });

  it('cria um novo feriado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HolidaysPage />);
    await screen.findByText('Natal');

    await user.click(screen.getByRole('button', { name: 'Novo feriado' }));
    await user.type(await screen.findByLabelText('Nome'), 'Aniversário da Cidade');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-09-15' } });
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Aniversário da Cidade')).toBeInTheDocument();
  });
});
