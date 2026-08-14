import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/render';
import { server } from '@/mocks/server';
import { env } from '@/config/env';
import { useOfficeStore } from '@/stores/office.store';
import { useClient } from '../api/queries';
import { clientsApi } from '../api/clients.api';
import { ClientFormDialog } from './client-form-dialog';

/**
 * Regressão da "CORREÇÃO FUNCIONAL — EDIÇÃO COMPLETA EM CLIENTES E
 * CONTATOS": a causa raiz não estava no formulário nem no backend (ambos já
 * cobriam todos os campos) — estava nos mocks (`mocks/handlers/clients.ts`),
 * cuja resposta de `GET /clients/:id` sobrescrevia endereço/nomeSocial/
 * razaoSocial/observações/responsável com valores fixos, ignorando o que
 * `PATCH` de fato gravava. `EditHarness` abaixo reproduz o mesmo padrão de
 * `EditClientBridge` (`clients-page.tsx`) — busca o `ClientDetailDTO`
 * completo antes de abrir o formulário, nunca o resumo da listagem.
 */
function EditHarness({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data: client } = useClient(clientId);
  return (
    <ClientFormDialog client={client} open={!!client} onOpenChange={(open) => !open && onClose()} />
  );
}

describe('ClientFormDialog', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('carrega telefone, celular, profissão, estado civil, filiação, data de nascimento e endereço já preenchidos ao editar', async () => {
    renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);

    expect(await screen.findByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument();

    await screen.findByRole('tab', { name: 'Pessoal' });

    await userEvent.click(screen.getByRole('tab', { name: 'Contato' }));
    expect(screen.getByLabelText('Telefone')).toHaveValue('11999990000');
    expect(screen.getByLabelText('Celular')).toHaveValue('11988880000');
    expect(screen.getByLabelText('Telefone residencial')).toHaveValue('1133334444');
    expect(screen.getByLabelText('E-mail adicional')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Pessoal' }));
    expect(screen.getByLabelText('Profissão')).toHaveValue('Engenheiro');
    expect(screen.getByLabelText('Nome da mãe')).toHaveValue('Maria da Silva');
    expect(screen.getByLabelText('Nome do pai')).toHaveValue('José da Silva');
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('1985-03-20');
    expect(screen.getByRole('combobox', { name: 'Estado civil' })).toHaveTextContent('Casado(a)');

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    expect(screen.getByLabelText('RG')).toHaveValue('123456789');

    await userEvent.click(screen.getByRole('tab', { name: 'Endereço' }));
    expect(screen.getByLabelText('CEP')).toHaveValue('01310000');
    expect(screen.getByLabelText('Estado')).toHaveValue('SP');
    // "Endereço" é também o nome da aba (role=tab) — `getByRole('textbox', ...)`
    // evita a colisão que `getByLabelText` teria com o botão da aba.
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('Rua das Flores');
    expect(screen.getByLabelText('Número')).toHaveValue('123');
    expect(screen.getByLabelText('Complemento')).toHaveValue('Apto 45');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Centro');
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo');
  });

  it('mostra Responsável apenas para Pessoa Jurídica e mantém o Tipo bloqueado ao editar', async () => {
    const { unmount } = renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);
    await screen.findByRole('heading', { name: 'Editar cliente' });
    expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeDisabled();
    unmount();

    renderWithProviders(<EditHarness clientId="client-2" onClose={() => {}} />);
    expect(await screen.findByLabelText('Responsável')).toHaveValue('Ana Responsável');
    await userEvent.click(screen.getByRole('tab', { name: 'Contato' }));
    expect(screen.getByLabelText('Telefone do responsável')).toHaveValue('11977776666');
    expect(screen.queryByLabelText('Telefone residencial')).not.toBeInTheDocument();
  });

  it('edita telefone, celular, profissão, RG e endereço e persiste via PATCH', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderWithProviders(<EditHarness clientId="client-1" onClose={() => (closed = true)} />);

    await screen.findByRole('heading', { name: 'Editar cliente' });

    await user.click(screen.getByRole('tab', { name: 'Contato' }));
    await user.clear(screen.getByLabelText('Celular'));
    await user.type(screen.getByLabelText('Celular'), '11977776666');

    await user.click(screen.getByRole('tab', { name: 'Pessoal' }));
    await user.clear(screen.getByLabelText('Profissão'));
    await user.type(screen.getByLabelText('Profissão'), 'Advogado');
    await user.click(screen.getByRole('tab', { name: 'Dados' }));
    await user.clear(screen.getByLabelText('RG'));
    await user.type(screen.getByLabelText('RG'), '99887766');

    await user.click(screen.getByRole('tab', { name: 'Endereço' }));
    await user.clear(screen.getByLabelText('Número'));
    await user.type(screen.getByLabelText('Número'), '456');

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(closed).toBe(true));

    const updated = await clientsApi.get('client-1');
    expect(updated.telefones[1]).toBe('11977776666');
    expect(updated.profissao).toBe('Advogado');
    expect(updated.enderecoNumero).toBe('456');
    expect(updated.enderecoLogradouro).toBe('Rua das Flores');
    expect(updated.rg).toBe('99887766');
  });

  it('Novo Cliente reutiliza o mesmo schema e estrutura de abas do Editar, sem bloquear o Tipo', async () => {
    renderWithProviders(<ClientFormDialog open onOpenChange={() => {}} />);

    expect(await screen.findByRole('heading', { name: 'Novo cliente' })).toBeInTheDocument();
    for (const tab of ['Dados', 'Pessoal', 'Contato', 'Endereço', 'Campos Extras']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }
    expect(screen.getByRole('combobox', { name: 'Tipo' })).not.toBeDisabled();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Categoria')).not.toBeInTheDocument();
  });

  it('Campos Extras carregam e persistem na edição', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);
    await screen.findByRole('heading', { name: 'Editar cliente' });
    await user.click(screen.getByRole('tab', { name: 'Campos Extras' }));
    await user.type(screen.getByLabelText('Data de Nascimento'), '2020-01-02');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(async () => {
      const updated = await clientsApi.get('client-1');
      expect(updated.camposExtrasValores['campo-extra-1']).toBe('2020-01-02');
    });
  });

  it('Campos Obrigatórios configurados impedem salvar', async () => {
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/configuration/required-fields`, () =>
        HttpResponse.json([{ entidade: 'CLIENTE', campo: 'enderecoBairro', obrigatorio: true }]),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ClientFormDialog open onOpenChange={() => {}} />);
    await user.type(await screen.findByLabelText('Nome completo'), 'Maria Souza');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Endereço' }));
    expect(await screen.findByText('Campo obrigatório para este escritório.')).toBeInTheDocument();
  });

  /**
   * Regressão da "CORREÇÃO PONTUAL — MODAL DE CLIENTE CORTADO NO TOPO E SEM
   * CENTRALIZAÇÃO VERTICAL": o `DialogContent` deve continuar `fixed`/
   * `top-1/2`/`left-1/2`/`-translate-x-1/2`/`-translate-y-1/2` (centralização
   * pela viewport, nunca alterado) e ganhar altura máxima segura
   * (`max-h-[85vh]`, `vh` puro — chegou a ser tentado `min(85dvh,
   * calc(100dvh - 2rem))`, mas `dvh` sem suporte no navegador invalida a
   * função `min()` inteira, o que faz `max-height` voltar a `none`; `vh` tem
   * suporte universal e evita esse risco por completo) com estrutura interna
   * Header/`DialogBody` (rolável)/Footer — nunca `overflow-y-auto` no
   * `DialogContent` inteiro (isso é o que fazia o cabeçalho rolar para fora
   * da tela). Testado via classes (frágil, mas é exatamente o que a correção
   * mexeu) e via presença estrutural das 3 regiões (robusto a refatoração de
   * classes futura).
   */
  it('mantém o DialogContent centralizado pela viewport com altura máxima segura, igual em Novo e Editar', async () => {
    const { unmount } = renderWithProviders(<ClientFormDialog open onOpenChange={() => {}} />);
    const createDialog = (await screen.findByRole('dialog')).className;
    unmount();

    renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);
    const editDialog = (await screen.findByRole('dialog')).className;

    for (const positioning of [
      'fixed',
      'top-1/2',
      'left-1/2',
      '-translate-x-1/2',
      '-translate-y-1/2',
    ]) {
      expect(createDialog).toContain(positioning);
    }
    expect(createDialog).toContain('max-h-[85vh]');
    // Overflow fica na região rolável interna (`DialogBody`), nunca no
    // Dialog inteiro — senão o cabeçalho rola para fora da viewport.
    expect(createDialog).not.toContain('overflow-y-auto');
    expect(createDialog).toContain('overflow-hidden');
    expect(editDialog).toBe(createDialog);
  });

  /**
   * Regressão da "CORREÇÃO DEFINITIVA — CENTRALIZAÇÃO DOS MODAIS DE NOVO/
   * EDITAR CLIENTE": causa raiz real (confirmada com Playwright real contra
   * o servidor de dev, não suposição) não era Portal quebrado nem ancestral
   * com `transform`/`filter`/`perspective` — era o `@keyframes
   * dialog-content-in`/`dialog-content-out` (globals.css) animando a
   * propriedade legada `transform: translate(-50%, -50%)` enquanto as
   * classes `-translate-x-1/2 -translate-y-1/2` do Tailwind v4 já usam a
   * propriedade nativa `translate` — as duas propriedades se COMPÕEM (não
   * se sobrescrevem), duplicando o deslocamento para -100% e jogando o
   * modal inteiro para fora da viewport. Medido no navegador real: antes da
   * correção, x/y do modal batiam exatamente com deslocamento de -100% da
   * própria largura/altura; depois da correção, x/y batem exatamente com o
   * centro geométrico da viewport nas 3 larguras testadas (1440, 1024,
   * 430px) em Novo Cliente e Editar Cliente. Este teste (jsdom, sem layout
   * real) cobre o que É verificável sem navegador: Portal renderizando de
   * verdade em `document.body`, e ausência das classes que indicariam
   * regressão para posicionamento absoluto/ancorado.
   */
  it('renderiza via Portal direto em document.body, sem absolute/top-0/left-0', async () => {
    renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);
    const dialog = await screen.findByRole('dialog');

    expect(dialog.parentElement).toBe(document.body);

    const classList = dialog.className;
    expect(classList).not.toMatch(/(?<!-)\babsolute\b/);
    expect(classList).not.toMatch(/\btop-0\b/);
    expect(classList).not.toMatch(/\bleft-0\b/);
  });

  it('estrutura o modal em header fixo, área rolável e footer fixo — as 3 regiões', async () => {
    renderWithProviders(<EditHarness clientId="client-1" onClose={() => {}} />);

    const dialog = await screen.findByRole('dialog');
    const heading = within(dialog).getByRole('heading', { name: 'Editar cliente' });
    const submitButton = within(dialog).getByRole('button', { name: 'Salvar alterações' });
    const scrollArea = within(dialog).getByRole('tablist').closest('[class*="overflow-y-auto"]');

    expect(heading).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(scrollArea).not.toBeNull();
    expect(scrollArea?.className).toContain('flex-1');
    expect(scrollArea?.className).toContain('min-h-0');

    // Header e footer nunca fazem parte da região rolável — cabeçalho e
    // botões continuam visíveis mesmo quando o formulário é longo.
    expect(scrollArea?.contains(heading)).toBe(false);
    expect(scrollArea?.contains(submitButton)).toBe(false);
  });
});
