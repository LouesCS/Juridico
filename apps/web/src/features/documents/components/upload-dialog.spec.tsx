import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { UploadDialog } from './upload-dialog';

describe('UploadDialog', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('envia um arquivo de ponta a ponta (presign → PUT → confirm) e mostra o toast de sucesso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadDialog />);

    await user.click(screen.getByRole('button', { name: /Enviar documento/i }));

    const input = screen.getByLabelText('Selecionar arquivos para enviar') as HTMLInputElement;
    const file = new File(['conteudo do arquivo'], 'novo-documento.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    expect(await screen.findByText('novo-documento.pdf')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('novo-documento.pdf').closest('li')).toHaveTextContent('novo-documento.pdf'));
  });

  it('rejeita arquivo com extensão bloqueada antes de tentar enviar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadDialog />);

    await user.click(screen.getByRole('button', { name: /Enviar documento/i }));

    const input = screen.getByLabelText('Selecionar arquivos para enviar') as HTMLInputElement;
    const file = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    await user.upload(input, file);

    expect(await screen.findByText('Tipo de arquivo não suportado.')).toBeInTheDocument();
  });
});
