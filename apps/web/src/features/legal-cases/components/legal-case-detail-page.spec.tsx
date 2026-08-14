import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { useOfficeStore } from '@/stores/office.store';
import { LegalCaseDetailPage } from './legal-case-detail-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/processos/case-1',
  useSearchParams: () => new URLSearchParams(),
}));

/** O Radix DropdownMenu/Select (RemotePicker, seletor de papel) pode
 * remontar o Dialog pai ao fechar — reconsulta o elemento (em vez de
 * confiar numa referência antiga) e aguarda ele não estar `aria-hidden`. */
async function settleDialog(): Promise<HTMLElement> {
  return waitFor(
    () => {
      const current = screen.getByRole('dialog');
      if (current.getAttribute('aria-hidden') === 'true') throw new Error('dialog ainda oculto');
      return current;
    },
    { timeout: 5000 },
  );
}

describe('LegalCaseDetailPage', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('mostra os dados do processo, painel lateral e o selo de segredo de justiça', async () => {
    renderWithProviders(<LegalCaseDetailPage caseId="case-sigiloso" />);

    expect(
      await screen.findByRole('heading', { name: 'Processo confidencial' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Segredo de justiça')).toBeInTheDocument();
  });

  it('mostra estado de erro quando o processo não existe (ou está fora do escopo/segredo de justiça sem acesso)', async () => {
    renderWithProviders(<LegalCaseDetailPage caseId="case-inexistente" />);

    expect(await screen.findByText('Não foi possível carregar este processo.')).toBeInTheDocument();
  });

  it('mostra a equipe do processo e permite adicionar um novo membro', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);

    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });
    await user.click(screen.getByRole('tab', { name: 'Equipe' }));

    expect(await screen.findByText('Responsável')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Adicionar membro' }));
    await user.click(await screen.findByRole('option', { name: 'Bruno Advogado' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(screen.getByText('Membro Adicionado')).toBeInTheDocument());
  });

  it('mostra os prazos do processo na aba Prazos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);

    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });
    await user.click(screen.getByRole('tab', { name: 'Prazos' }));

    expect(await screen.findByText('Audiência de conciliação')).toBeInTheDocument();
  });

  it('reutiliza Movimentações, Publicações, Captura e Audit no detalhe global', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);
    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });

    await user.click(screen.getByRole('tab', { name: 'Movimentações' }));
    expect(await screen.findByText(/Movimentações judiciais/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Publicações' }));
    expect(await screen.findByText(/Publicações \(/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Captura' }));
    expect(await screen.findByText(/Configurações de captura/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(
      await screen.findByRole('heading', { name: 'Auditoria de atividades' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Atividades recentes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Atividades antigas' })).toBeInTheDocument();
  });

  it('separa o detalhe Extrajudicial e lista somente suas Movimentações Extrajudiciais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });

    expect(screen.getAllByText('700123955').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Dados principais' })).toBeInTheDocument();
    expect(screen.getByText('Instituição')).toBeInTheDocument();
    expect(screen.getByText('06/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pasta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JOÃO DA SILVA/1' })).toHaveAttribute(
      'href',
      '/pastas/folder-1',
    );
    expect(await screen.findByRole('heading', { name: 'Requerentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requeridos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Outras partes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'João Carlos Donassolo' })).toHaveAttribute(
      'href',
      '/clientes/client-1',
    );
    expect(screen.getByText(/Maria da Silva com um nome/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Instituto Nacional do Seguro Social' }),
    ).toHaveAttribute('href', '/clientes/client-2');
    expect(screen.getByText('Ana Testemunha')).toBeInTheDocument();
    expect(screen.queryByText(/principal:/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ações' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pedidos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tarefas' })).toBeInTheDocument();
    expect(screen.queryByText('Assistente IA')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Atividades recentes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Atividades antigas' })).toBeInTheDocument();

    expect(screen.queryByRole('tab', { name: 'Publicações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Captura' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Movimentações extrajudiciais' }));
    expect(await screen.findByText('Movimentações extrajudiciais (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '09/08/2026' })).toHaveAttribute(
      'href',
      '/movimentacoes-extrajudiciais/extra-1',
    );
  });

  it('abre a edição especializada no Extrajudicial e preserva o formulário Judicial', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(
      await screen.findByRole('heading', { name: 'Editar Processo Extrajudicial' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    for (const label of [
      'Protocolo *',
      'Instituição',
      'Data de entrada *',
      'Data de conclusão',
      'Situação',
      'Anotações',
      'Requerente principal *',
      'Requerido principal *',
      'Número do Benefício',
    ]) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('Número CNJ *')).not.toBeInTheDocument();
    expect(screen.queryByText('Tipo de vinculação *')).not.toBeInTheDocument();
    view.unmount();

    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);
    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(
      await screen.findByRole('heading', { name: 'Editar Processo Judicial' }),
    ).toBeInTheDocument();
    const judicialDialog = screen.getByRole('dialog');
    for (const label of [
      'Número CNJ *',
      'Unidade de origem',
      'Comarca',
      'Tribunal',
      'Tipo de ação',
      'Área *',
      'Tipo de vinculação *',
      'Instância judicial *',
      'Data de entrada *',
      'Situação',
      'Data de conclusão',
      'Anotações',
      'Número do Benefício',
      'RO - Número do Benefício',
    ]) {
      expect(within(judicialDialog).getByText(label)).toBeInTheDocument();
    }
    // Nenhum campo exclusivo do Extrajudicial vaza para o formulário Judicial.
    expect(within(judicialDialog).queryByText('Protocolo *')).not.toBeInTheDocument();
    expect(within(judicialDialog).queryByText('Instituição')).not.toBeInTheDocument();
  });

  it('gerencia participantes em estado local, troca principal e bloqueia remoção do principal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    let dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getAllByText(
        'Maria da Silva com um nome suficientemente longo para validar o truncamento responsivo',
      ).length,
    ).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('button', { name: 'Adicionar requerente' }));
    await user.type(screen.getByLabelText('Pesquisar Adicionar requerente'), 'Acme');
    await user.click(await screen.findByRole('option', { name: /Acme Ltda/ }));
    dialog = await settleDialog();
    await user.click(within(dialog).getAllByRole('button', { name: 'Adicionar' })[0]);
    const acmeRow = dialog.querySelector('[title="Acme Ltda"]')!.closest('div')!;
    await user.click(within(acmeRow).getByRole('button', { name: 'Definir como principal' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remover requerente principal' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Escolha outro Requerente principal antes de removê-lo.',
    );
  });

  it('adiciona Requerido, troca principal, impede duplicidade e remove participante não principal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('Instituto Nacional do Seguro Social').length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('button', { name: 'Adicionar requerido' }));
    await user.type(screen.getByLabelText('Pesquisar Adicionar requerido'), 'Cliente Com Processo');
    await user.click(await screen.findByRole('option', { name: /Cliente Com Processo Ativo/ }));
    dialog = await settleDialog();
    await user.click(within(dialog).getAllByRole('button', { name: 'Adicionar' })[1]);
    const novoRow = dialog.querySelector('[title="Cliente Com Processo Ativo"]')!.closest('div')!;
    expect(within(novoRow).getByRole('button', { name: 'Definir como principal' })).toBeInTheDocument();

    // Duplicidade: tentar adicionar a mesma pessoa com o mesmo papel novamente.
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar requerido' }));
    await user.click(await screen.findByRole('option', { name: /Cliente Com Processo Ativo/ }));
    dialog = await settleDialog();
    await user.click(within(dialog).getAllByRole('button', { name: 'Adicionar' })[1]);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Esta pessoa já possui este papel no Processo.',
    );

    // Troca o Requerido principal para o novo participante.
    await user.click(within(novoRow).getByRole('button', { name: 'Definir como principal' }));
    const antigoPrincipalRow = dialog
      .querySelector('[title="Instituto Nacional do Seguro Social"]')!
      .closest('div')!;
    expect(
      within(antigoPrincipalRow).getByRole('button', { name: 'Definir como principal' }),
    ).toBeInTheDocument();

    // Remove o participante que deixou de ser principal.
    await user.click(
      within(antigoPrincipalRow).getByRole('button', {
        name: 'Remover Instituto Nacional do Seguro Social',
      }),
    );
    expect(
      dialog.querySelector('[title="Instituto Nacional do Seguro Social"]'),
    ).not.toBeInTheDocument();
  });

  it('adiciona Outra parte com papel obrigatório, remove parte existente e persiste após salvar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ana Testemunha')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Remover Ana Testemunha' }));
    expect(within(dialog).queryByText('Ana Testemunha')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Pessoa' }));
    await user.type(screen.getByLabelText('Pesquisar Pessoa'), 'Acme');
    await user.click(await screen.findByRole('option', { name: /Acme Ltda/ }));
    dialog = await settleDialog();
    const roleComboboxes = within(dialog).getAllByRole('combobox');
    await user.click(roleComboboxes[roleComboboxes.length - 1]);
    await user.click(await screen.findByRole('option', { name: 'Perito' }));
    dialog = await settleDialog();
    await user.click(within(dialog).getAllByRole('button', { name: 'Adicionar' })[2]);
    expect(dialog.querySelector('[title="Acme Ltda"]')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const peritoText = await screen.findByText('Acme Ltda');
    expect(within(peritoText.parentElement!).getByText('Perito')).toBeInTheDocument();
    expect(screen.queryByText('Ana Testemunha')).not.toBeInTheDocument();
  });

  it('abre a criação oficial de Tarefa com Processo e Pasta contextuais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-extra-1" />);
    await screen.findByRole('heading', { name: 'Processo extrajudicial' });
    await user.click(screen.getByRole('tab', { name: 'Tarefas' }));
    await user.click(await screen.findByRole('button', { name: 'Adicionar tarefa' }));
    expect(await screen.findByRole('heading', { name: 'Nova tarefa' })).toBeInTheDocument();
    expect(screen.getByText('Processo atual')).toBeInTheDocument();
    expect(screen.getByText('Pasta JOÃO DA SILVA/1')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Título'), 'Revisar requerimento administrativo');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(
      await screen.findByRole('link', { name: 'Revisar requerimento administrativo' }),
    ).toHaveAttribute('href', expect.stringMatching(/^\/tarefas\//));
  });

  it('mostra Dados principais, Pasta, Autores, Réus e Outras partes no workspace Judicial', async () => {
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);
    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });

    expect(screen.getByRole('heading', { name: 'Dados principais' })).toBeInTheDocument();
    expect(screen.getAllByText('1234567-19.2024.8.26.0001').length).toBeGreaterThan(0);
    expect(screen.getByText('TJSP')).toBeInTheDocument();
    expect(screen.getByText('1ª Vara Cível')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Pasta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JOÃO DA SILVA/1' })).toHaveAttribute(
      'href',
      '/pastas/folder-1',
    );

    expect(await screen.findByRole('heading', { name: 'Autores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Réus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Outras partes' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'João da Silva' })[0]).toHaveAttribute(
      'href',
      '/clientes/client-1',
    );
    expect(screen.getByText('Dra. Beatriz Nunes')).toBeInTheDocument();
    expect(screen.getByText('Advogado principal dos autores')).toBeInTheDocument();
    expect(screen.getByText('Advogado principal dos réus')).toBeInTheDocument();
    expect(screen.getByText('Juiz Carlos Mendes')).toBeInTheDocument();
    expect(screen.getByText('Juiz')).toBeInTheDocument();
  });

  it('expõe Pedidos e Tarefas como abas do workspace Judicial', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);
    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });

    await user.click(screen.getByRole('tab', { name: 'Pedidos' }));
    expect(await screen.findByText(/Pedidos \(/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Tarefas' }));
    expect(await screen.findByRole('heading', { name: 'Tarefas' })).toBeInTheDocument();
  });

  it('edita e salva o Processo Judicial pelo formulário especializado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LegalCaseDetailPage caseId="case-1" />);
    await screen.findByRole('heading', { name: 'Ação de cobrança — Silva vs. Acme' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await screen.findByRole('heading', { name: 'Editar Processo Judicial' });
    const dialog = screen.getByRole('dialog');

    const observacoes = dialog.querySelector('textarea')!;
    await user.type(observacoes, 'Aguardando audiência.');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
