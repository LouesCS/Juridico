import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { LegalCasesPage } from './legal-cases-page';

describe('LegalCasesPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('lista os processos reais de GET /legal-cases', async () => {
    renderWithProviders(<LegalCasesPage />);

    expect(
      await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Processos judiciais (2)' })).toBeInTheDocument();
  });

  it('sinaliza processo em segredo de justiça com indicador visual', async () => {
    renderWithProviders(<LegalCasesPage />);

    expect(await screen.findByLabelText('Segredo de justiça')).toBeInTheDocument();
  });

  it('filtra processos pela busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage />);

    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });
    await user.type(screen.getByLabelText('Buscar processos'), 'confidencial');

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: '1234567-19.2024.8.26.0001' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByLabelText('Segredo de justiça')).toBeInTheDocument();
  });

  it('mantém a rota global como listagem sem criação independente', async () => {
    renderWithProviders(<LegalCasesPage />);

    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });
    expect(screen.queryByRole('button', { name: 'Novo processo' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Processos judiciais (2)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JOÃO DA SILVA/1' })).toHaveAttribute(
      'href',
      '/pastas/folder-1',
    );
  });

  it('mostra Autor/Réu principal, Advogados e dados da Pasta com links reais na grid Judicial', async () => {
    renderWithProviders(<LegalCasesPage />);
    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });

    expect(screen.getAllByRole('link', { name: 'João da Silva' })[0]).toHaveAttribute(
      'href',
      '/clientes/client-1',
    );
    expect(screen.getByRole('link', { name: 'Acme Ltda' })).toHaveAttribute(
      'href',
      '/clientes/client-2',
    );
    expect(screen.getByText('Dra. Beatriz Nunes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JOÃO DA SILVA/1' })).toHaveAttribute(
      'href',
      '/pastas/folder-1',
    );
    // Processo confidencial não tem CNJ nem partes cadastradas no mock — a
    // grid mostra "--" em vez de inventar conteúdo.
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });

  it('filtra por Data de entrada com Consultar/Limpar e ordena server-side', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage tipo="JUDICIAL" />);
    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });

    await user.type(screen.getByLabelText('Data de entrada — Mín.'), '2026-02-01');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: '1234567-19.2024.8.26.0001' }),
      ).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(
      await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Ordenar por' }));
    expect(
      await screen.findByRole('option', { name: 'Data de entrada decrescente' }),
    ).toBeInTheDocument();
  });

  it('na rota Judicial renderiza somente os filtros de data e a ordenação própria', async () => {
    renderWithProviders(<LegalCasesPage tipo="JUDICIAL" />);
    await screen.findByRole('heading', { name: 'Processos judiciais (2)' });

    expect(screen.getByLabelText('Data de entrada — Mín.')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de entrada — Máx.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Buscar por título ou número CNJ'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Todos os status')).not.toBeInTheDocument();
    expect(screen.queryByText('Todas as prioridades')).not.toBeInTheDocument();
    expect(screen.queryByText('Todos os processos')).not.toBeInTheDocument();
    expect(screen.queryByText('Última movimentação')).not.toBeInTheDocument();
  });

  it('bloqueia intervalo Judicial inválido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage tipo="JUDICIAL" />);
    await screen.findByRole('heading', { name: 'Processos judiciais (2)' });

    await user.type(screen.getByLabelText('Data de entrada — Mín.'), '2026-12-31');
    await user.type(screen.getByLabelText('Data de entrada — Máx.'), '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data mínima não pode ser posterior à data máxima.',
    );
    expect(screen.getByRole('heading', { name: 'Processos judiciais (2)' })).toBeInTheDocument();
  });

  it('menu de Ações da grid Judicial oferece Visualizar/Editar/Remover conforme permissão', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage />);
    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });

    await user.click(
      screen.getByRole('button', { name: 'Ações para Ação de cobrança — Silva vs. Acme' }),
    );
    expect(screen.getByRole('menuitem', { name: 'Visualizar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toBeInTheDocument();
  });

  it('mostra estado vazio quando nenhum processo é encontrado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage />);

    await screen.findByRole('link', { name: '1234567-19.2024.8.26.0001' });
    await user.type(screen.getByLabelText('Buscar processos'), 'não existe nenhum assim');

    expect(await screen.findByText('Nenhum processo encontrado')).toBeInTheDocument();
  });

  it('reutiliza a listagem global filtrada somente para Processos Extrajudiciais', async () => {
    renderWithProviders(<LegalCasesPage tipo="EXTRAJUDICIAL" />);

    expect(await screen.findByText('700123955')).toBeInTheDocument();
    expect(screen.queryByText('Ação de cobrança — Silva vs. Acme')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Processos extrajudiciais (1)' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo|adicionar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Visão consolidada/)).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'PROTOCOLOINSTITUIÇÃODATA DE ENTRADA',
      'REQUERENTE PRINCIPALREQUERIDO PRINCIPALDATA DE CONCLUSÃO',
      'PASTAENCARREGADO DA PASTACLIENTE PRINCIPAL DA PASTA',
      'SITUAÇÃO',
      'AÇÕES',
    ]);
    expect(screen.getByRole('link', { name: '700123955' })).toHaveAttribute(
      'href',
      '/processos/case-extra-1',
    );
  });

  it('usa Sheet com filtros temporários e ações contextuais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage tipo="EXTRAJUDICIAL" />);
    await screen.findByText('700123955');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    expect(screen.getByRole('heading', { name: 'Mais filtros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Protocolo')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de entrada de')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de conclusão até')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pastas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encarregados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partes contrárias' })).toBeInTheDocument();
    expect(screen.getByLabelText('Sem movimentações após')).toBeInTheDocument();
    expect(screen.queryByText('Prioridade')).not.toBeInTheDocument();
    expect(screen.queryByText('Responsabilidade')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Ações de 700123955' }));
    expect(screen.getByRole('menuitem', { name: 'Visualizar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toBeInTheDocument();
  });

  it('valida intervalos e bloqueia Consultar sem aplicar o rascunho', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCasesPage tipo="EXTRAJUDICIAL" />);
    await screen.findByText('700123955');
    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    await user.type(screen.getByLabelText('Data de entrada de'), '2026-12-31');
    await user.type(screen.getByLabelText('Data de entrada até'), '2026-01-01');
    expect(
      screen.getByText('A data inicial deve ser anterior ou igual à final.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeDisabled();
  });
});
