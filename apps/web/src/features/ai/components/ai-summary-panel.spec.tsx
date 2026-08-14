import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { AiSummaryPanel } from './ai-summary-panel';

describe('AiSummaryPanel', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }]);
  });

  it('estado vazio mostra o botão de gerar resumo, nunca uma tela em branco', async () => {
    renderWithProviders(<AiSummaryPanel escopoTipo="PROCESSO" escopoId="processo-1" />);
    expect(await screen.findByText('Nenhum resumo gerado ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar resumo/ })).toBeInTheDocument();
  });

  it('mostra o seletor de tipo de resumo só para escopo PROCESSO', async () => {
    renderWithProviders(<AiSummaryPanel escopoTipo="PROCESSO" escopoId="processo-1" />);
    await screen.findByText('Nenhum resumo gerado ainda');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('não mostra o seletor de tipo de resumo para escopo DOCUMENTO/CLIENTE', async () => {
    renderWithProviders(<AiSummaryPanel escopoTipo="DOCUMENTO" escopoId="doc-1" />);
    await screen.findByText('Nenhum resumo gerado ainda');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('gera um resumo real (presign→confirm não existe aqui — POST direto) e mostra o conteúdo + selo obrigatório + fontes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSummaryPanel escopoTipo="PROCESSO" escopoId="processo-2" />);

    await user.click(await screen.findByRole('button', { name: /Gerar resumo/ }));

    expect(await screen.findByText(/Resumo \(GERAL\) do processo/)).toBeInTheDocument();
    expect(screen.getByText('Resposta gerada por IA. Revise antes de utilizar.')).toBeInTheDocument();
    expect(screen.getByText('Metadados analisados')).toBeInTheDocument();
  });

  it('feedback 👍/👎 chama a API e marca o botão pressionado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSummaryPanel escopoTipo="PROCESSO" escopoId="processo-3" />);
    await user.click(await screen.findByRole('button', { name: /Gerar resumo/ }));
    await screen.findByText(/Resumo \(GERAL\) do processo/);

    await user.click(screen.getByRole('button', { name: 'Achei útil' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Achei útil' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('regenerar cria uma nova versão do resumo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSummaryPanel escopoTipo="PROCESSO" escopoId="processo-4" />);
    await user.click(await screen.findByRole('button', { name: /Gerar resumo/ }));
    await screen.findByText('v1', { exact: false });

    await user.click(screen.getByRole('button', { name: /Regenerar/ }));

    await waitFor(() => expect(screen.getByText('v2', { exact: false })).toBeInTheDocument());
  });
});
