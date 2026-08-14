import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useOfficeStore } from '@/stores/office.store';
import { env } from '@/config/env';
import { server } from '@/mocks/server';
import { legalFolderMock } from '@/mocks/handlers/legal-folders';
import { LegalFoldersPage } from './legal-folders-page';

const permissions = vi.hoisted(() => new Set<string>());
vi.mock('@/hooks/use-permission', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));

describe('LegalFoldersPage', () => {
  function renderPage() {
    function Wrapper({ children }: { children: React.ReactNode }) {
      const [client] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      );
      return (
        <NuqsTestingAdapter hasMemory>
          <QueryClientProvider client={client}>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryClientProvider>
        </NuqsTestingAdapter>
      );
    }
    return render(<LegalFoldersPage />, { wrapper: Wrapper });
  }

  beforeEach(() => {
    permissions.clear();
    permissions.add('legal-folder:create');
    permissions.add('legal-folder:update');
    useOfficeStore.getState().reset();
    useOfficeStore
      .getState()
      .hydrateFromLogin('mock-office-1', [
        { id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' },
      ]);
  });

  it('apresenta a hierarquia, os nomes e os links oficiais', async () => {
    renderPage();
    const identifier = await screen.findByRole('link', { name: 'MARIA OLIVEIRA/1' });
    expect(screen.getByRole('columnheader', { name: 'Identificador' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Pasta' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoria' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Etapa' })).not.toBeInTheDocument();
    expect(identifier).toHaveAttribute('href', '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(screen.getByRole('link', { name: 'João Silva' })).toHaveAttribute(
      'href',
      '/colaboradores/member-demo-1',
    );
    expect(
      screen.getByRole('link', { name: /Cliente principal:.*Maria Oliveira/ }),
    ).toHaveAttribute('href', '/clientes/11111111-1111-4111-8111-111111111111');
    expect(
      screen.getByRole('link', { name: /Parte contrária principal:.*Empresa XYZ/ }),
    ).toHaveAttribute('href', '/clientes/22222222-2222-4222-8222-222222222222');
    expect(screen.getByText('Responsabilidade civil')).toBeInTheDocument();
    expect(screen.getByText(/Data de cadastro:/).parentElement).toHaveTextContent('01/08/2026');
    expect(screen.getByText(/Arquivada:/).parentElement).toHaveTextContent('Não');
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('permite alterar o Encarregado pelo fluxo protegido de edição', async () => {
    const user = userEvent.setup();
    renderPage();
    const identifier = await screen.findByRole('link', { name: 'MARIA OLIVEIRA/1' });
    const row = identifier.closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row!).getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('dialog', { name: 'Editar Pasta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encarregado *' })).toBeInTheDocument();
  });

  it('abre Nova Pasta com sequência backend, Etapa bloqueada e campos centrais distintos', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Nova Pasta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova Pasta' });
    expect(within(dialog).getByText('Identificador *')).toBeInTheDocument();
    expect(within(dialog).queryByText('Prefixo')).not.toBeInTheDocument();
    const identifier = within(dialog).getByRole('button', { name: 'Cliente do Identificador' });
    await user.click(identifier);
    const identifierSearch = screen.getByRole('textbox', {
      name: 'Pesquisar Cliente do Identificador',
    });
    await user.type(identifierSearch, 'João');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'João da Silva' }));
    expect(identifier).toHaveTextContent('João da Silva');
    await user.keyboard('{Escape}');
    expect(within(dialog).getByRole('button', { name: 'Clientes *' })).toHaveTextContent(
      'João da Silva',
    );
    expect(within(dialog).getByLabelText('Número')).toBeDisabled();
    expect(within(dialog).getByDisplayValue('Cadastramento')).toBeDisabled();
    expect(within(dialog).getByLabelText('Assunto *')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Categoria *' })).toBeInTheDocument();
    expect(within(dialog).getByText('Clientes *')).toBeInTheDocument();
    expect(within(dialog).getByText('Partes contrárias')).toBeInTheDocument();
    expect(within(dialog).getByText('Interessados')).toBeInTheDocument();
    expect(within(dialog).queryByText('Outros clientes')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Outras partes contrárias')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Processos')).not.toBeInTheDocument();
    for (const label of [
      'Data do Atendimento',
      'Tipo de Atendimento',
      'Advogado Atendente',
      'Sub Área',
      'Setor Comercial',
      'Quem indicou?',
      'Parceiro Quem?',
      'Núcleos',
      'Nº da Pasta Física - Migração',
      'Assistente Técnico',
      'High Ticket',
      'Outras Anotações',
    ])
      expect(
        within(dialog).getAllByText(new RegExp(`^${label.replace(/[?]/g, '\\?')}(?: \\*)?$`))
          .length,
      ).toBeGreaterThan(0);
    expect(within(dialog).getByText('0 / 50.000 caracteres')).toBeInTheDocument();
  });

  it('abre e fecha a consulta rápida com vínculos e Campos Extras dinâmicos', async () => {
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/legal-folders/options`, () =>
        HttpResponse.json({
          categorias: [],
          situacoes: [],
          etapaInicial: 'CADASTRAMENTO',
          camposExtras: [
            {
              id: 'field-1',
              entidade: 'PASTA_JURIDICA',
              nome: 'Atendimento em',
              chave: 'atendimento_em',
              tipo: 'DATA',
              obrigatorio: false,
              opcoes: [],
              valorPadrao: null,
              ordem: 1,
              ativo: true,
            },
            {
              id: 'field-2',
              entidade: 'PASTA_JURIDICA',
              nome: 'Prioritário',
              chave: 'prioritario',
              tipo: 'BOOLEANO',
              obrigatorio: false,
              opcoes: [],
              valorPadrao: null,
              ordem: 2,
              ativo: true,
            },
            {
              id: 'field-3',
              entidade: 'PASTA_JURIDICA',
              nome: 'Núcleos',
              chave: 'nucleos',
              tipo: 'MULTISELECT',
              obrigatorio: false,
              opcoes: [],
              valorPadrao: null,
              ordem: 3,
              ativo: true,
            },
            {
              id: 'field-4',
              entidade: 'PASTA_JURIDICA',
              nome: 'Observação configurada',
              chave: 'sem_valor',
              tipo: 'TEXTO',
              obrigatorio: false,
              opcoes: [],
              valorPadrao: null,
              ordem: 4,
              ativo: true,
            },
          ],
        }),
      ),
      http.get(`${env.NEXT_PUBLIC_API_URL}/legal-folders/:id`, () =>
        HttpResponse.json({
          ...legalFolderMock,
          camposExtrasValores: {
            atendimento_em: '2026-03-19',
            prioritario: 'true',
            nucleos: '["Cível","Previdenciário"]',
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Visualizar' }));
    const panel = await screen.findByRole('dialog', { name: 'Pasta' });
    expect(within(panel).getByText('Dados da Pasta')).toBeInTheDocument();
    expect(within(panel).getByText('Etapa').nextElementSibling).toHaveTextContent('Cadastramento');
    expect(within(panel).getByRole('link', { name: 'Maria Oliveira' })).toHaveAttribute(
      'href',
      '/clientes/11111111-1111-4111-8111-111111111111',
    );
    expect(within(panel).getByRole('link', { name: 'José Oliveira' })).toHaveAttribute(
      'href',
      '/clientes/33333333-3333-4333-8333-333333333333',
    );
    expect(within(panel).getByText('Seguradora ABC')).toBeInTheDocument();
    expect(within(panel).getByText('19/03/2026')).toBeInTheDocument();
    expect(within(panel).getByText('Sim')).toBeInTheDocument();
    expect(within(panel).getByText('Cível, Previdenciário')).toBeInTheDocument();
    expect(within(panel).getByText('Observação configurada').nextElementSibling).toHaveTextContent(
      '--',
    );
    await user.click(within(panel).getAllByRole('button', { name: 'Fechar' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Pasta' })).not.toBeInTheDocument();
  });

  it('não oferece edição do Encarregado sem legal-folder:update', async () => {
    permissions.delete('legal-folder:update');
    renderPage();
    await screen.findByRole('link', { name: 'MARIA OLIVEIRA/1' });
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
