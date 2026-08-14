import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TooltipProvider } from '@/components/ui/tooltip';
import { env } from '@/config/env';
import { server } from '@/mocks/server';
import { LegalFolderDetailPage } from './legal-folder-detail-page';

const permissions = vi.hoisted(() => new Set<string>());
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/office', () => ({
  useOffice: () => ({ escritorioAtivoId: 'office-1' }),
}));
vi.mock('@/hooks/use-permission', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));

describe('LegalFolderDetailPage', () => {
  function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <LegalFolderDetailPage id="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" />
        </TooltipProvider>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    permissions.clear();
    for (const permission of [
      'publication:read',
      'movement:read',
      'capture:read',
      'document:read:all',
      'document:create',
      'document:update',
      'task:read:all',
      'ai:summarize',
      'member:read',
      'client:read',
      'case:read:all',
      'case:create',
      'legal-folder:update',
      'legal-folder:create',
      'legal-folder:delete',
      'extrajudicial-movement:read',
      'extrajudicial-movement:create',
      'extrajudicial-movement:update',
    ])
      permissions.add(permission);
  });

  it('mantém Documentos ao lado de Serviços e Tarefas, com total, ordenação e upload contextual', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    await screen.findByRole('tab', { name: 'Documentos (0)' });
    const tabs = screen.getAllByRole('tab');
    const labels = tabs.map((tab) => tab.textContent);
    expect(labels.indexOf('Documentos (0)')).toBeLessThan(labels.indexOf('Serviços'));
    expect(labels.indexOf('Serviços')).toBeLessThan(labels.findIndex((label) => label?.startsWith('Tarefas')));
    await user.click(screen.getByRole('tab', { name: 'Documentos (0)' }));
    expect(screen.getByRole('combobox', { name: 'Ordenar documentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar documento' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum documento encontrado.')).toBeInTheDocument();
  });

  it('usa total server-side, pagina e abre o detalhe global com link acessível', async () => {
    const requests: string[] = [];
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/documents`, ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({
          items: [{
            id: 'doc-folder-1', nome: 'Petição inicial.pdf', extensao: 'pdf',
            mimeType: 'application/pdf', tamanhoBytes: '2048', tipo: 'PETICAO',
            categoria: null, confidencialidade: 'PADRAO', statusUpload: 'CONCLUIDO',
            statusProcessamento: 'PRONTO', statusAntivirus: 'LIMPO', versaoAtual: 2,
            totalVersoes: 2, pasta: { id: 'document-folder-1', nome: 'Petições' },
            processo: null, cliente: null, autor: { id: 'member-1', nome: 'Ana', avatarUrl: null },
            tags: [], favorito: false, criadoEm: '2026-08-01T12:00:00Z',
            atualizadoEm: '2026-08-12T12:00:00Z', excluidoEm: null,
          }],
          nextCursor: null,
          total: 25,
          disponivel: true,
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const tab = await screen.findByRole('tab', { name: 'Documentos (25)' });
    await user.click(tab);
    const link = screen.getByRole('link', { name: 'Petição inicial.pdf' });
    expect(link).toHaveAttribute('href', '/documentos/doc-folder-1');
    expect(link.className).toContain('hover:underline');
    expect(link.className).toContain('focus-visible:ring-2');
    expect(screen.getByText(/v2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(requests.some((url) => {
      const query = new URL(url).searchParams;
      return query.get('resourceType') === 'PASTA_JURIDICA'
        && query.get('resourceId') === 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
        && query.get('page') === '2';
    })).toBe(true);
  });

  it('oculta upload e desvinculação sem as permissões de escrita do Document Engine', async () => {
    permissions.delete('document:create');
    permissions.delete('document:update');
    renderPage();
    const tab = await screen.findByRole('tab', { name: /^Documentos \(/ });
    await userEvent.click(tab);
    expect(screen.queryByRole('button', { name: 'Adicionar documento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desvincular da Pasta' })).not.toBeInTheDocument();
  });

  it('isola erro de Documentos e permite retry sem afetar Serviços e Tarefas', async () => {
    let attempts = 0;
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/documents`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ detail: 'Falha isolada' }, { status: 500 })
          : HttpResponse.json({ items: [], nextCursor: null, total: 0, disponivel: true });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', { name: /^Documentos \(/ }));
    expect(await screen.findByText('Não foi possível carregar os Documentos.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhum documento encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Serviços' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tarefas/ })).toBeInTheDocument();
  });

  it('não confunde Movimentação Extrajudicial com Processo Extrajudicial', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    const tab = await screen.findByRole('tab', { name: 'Processos extrajudiciais (1)' });
    await user.click(tab);
    expect(screen.getByText(/Procedimento administrativo previdenciário/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Processo Extrajudicial' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contato realizado para negociação de acordo.')).not.toBeInTheDocument();
  });

  it('abre Ações na ordem definida e confirma somente operações com domínio real', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    await user.click(screen.getByRole('button', { name: /Ações/ }));
    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Concluir',
      'Controle de acesso',
      'Copiar pasta',
      'Imprimir',
      'Adicionar prognóstico e valores',
      'Remover',
      'Timeline',
    ]);
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toHaveAttribute('data-disabled');
    await user.click(screen.getByRole('menuitem', { name: 'Concluir' }));
    expect(screen.getByRole('dialog', { name: 'Concluir Pasta?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Concluir Pasta?' })).not.toBeInTheDocument();
  });

  it('mantém dados, partes e Campos Extras e cria todos os Cards definitivos', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' }),
    ).toBeInTheDocument();
    for (const title of [
      'Dados principais',
      'Partes',
      'Campos extras',
      'Processual',
      'Publicações',
      'Trabalho',
      'Financeiro',
      'Inteligência Artificial',
      'Auditoria',
      'Anexos',
      'Comentários',
    ])
      expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Maria Oliveira' })).toHaveAttribute(
      'href',
      '/clientes/11111111-1111-4111-8111-111111111111',
    );
    expect(screen.getByText('Data do Atendimento')).toBeInTheDocument();
  });

  it('reutiliza Processos, Publicações, Movimentações, Capturas, Documentos e Tarefas reais', async () => {
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/tasks`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'task-folder-1',
              titulo: 'Preparar contestação',
              categoria: null,
              status: { id: 'status-1', valor: 'A Fazer' },
              prioridade: { id: 'priority-1', valor: 'Alta' },
              responsavel: { id: 'member-1', nome: 'João Silva', avatarUrl: null },
              solicitante: { id: 'member-2', nome: 'Ana Souza', avatarUrl: null },
              vinculos: [
                {
                  tipoRecurso: 'CLIENTE',
                  recursoId: '11111111-1111-4111-8111-111111111111',
                  recurso: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
                },
                {
                  tipoRecurso: 'PROCESSO',
                  recursoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  recurso: {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    nome: 'Ação de indenização',
                    numeroCnj: '1234567-19.2024.8.26.0001',
                  },
                },
              ],
              dataVencimento: '2026-08-20',
              concluidaEm: null,
              canceladaEm: null,
              arquivadaEm: null,
              favorita: false,
              atrasada: false,
            },
          ],
          nextCursor: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    const processLinks = await screen.findAllByRole('link', { name: /Ação de indenização/ });
    expect(
      processLinks.find(
        (link) => link.getAttribute('href') === '/processos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ),
    ).toBeDefined();
    await user.click(screen.getByRole('tab', { name: /Publicações \(1\)/ }));
    expect(screen.getByText('Intimação publicada no diário oficial.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '08/08/2026' })).toHaveAttribute(
      'href',
      '/publicacoes?publicacao=publication-folder-1',
    );
    await user.click(screen.getByRole('tab', { name: /Movimentações judiciais \(1\)/ }));
    expect(screen.getByText('Despacho de mero expediente.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '09/08/2026' })).toHaveAttribute(
      'href',
      '/movimentacoes-judiciais/movement-folder-1',
    );
    await user.click(screen.getByRole('tab', { name: /Configurações de captura \(1\)/ }));
    expect(
      screen
        .getAllByRole('link', { name: '1234567-19.2024.8.26.0001' })
        .find(
          (link) =>
            link.getAttribute('href') === '/configuracoes-captura?configuracao=capture-folder-1',
        ),
    ).toBeDefined();
    await user.click(await screen.findByRole('tab', { name: /Documentos \(0\)/ }));
    expect(screen.getByText('Nenhum documento encontrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Tarefas/ }));
    expect(await screen.findByRole('link', { name: 'Preparar contestação' })).toHaveAttribute(
      'href',
      '/tarefas/task-folder-1',
    );
    expect(
      screen
        .getAllByRole('link', { name: 'João Silva' })
        .find((link) => link.getAttribute('href') === '/colaboradores/member-1'),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ana Souza' })).toHaveAttribute(
      'href',
      '/colaboradores/member-2',
    );
  });

  it('remove apenas a navegação quando falta permissão do recurso de destino', async () => {
    permissions.delete('client:read');
    permissions.delete('member:read');
    permissions.delete('case:read:all');
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Maria Oliveira' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ação de indenização/ })).not.toBeInTheDocument();
  });

  it('distingue placeholders de módulos inexistentes e protege abas sem permissão', async () => {
    const user = userEvent.setup();
    permissions.delete('publication:read');
    permissions.delete('movement:read');
    permissions.delete('capture:read');
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    expect(screen.queryByRole('tab', { name: /Publicações/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Movimentações judiciais/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Configurações de captura/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Pedidos' }));
    expect(screen.getAllByText('Módulo ainda não disponível.').length).toBeGreaterThan(0);
  });

  it('isola erro de Tarefas sem derrubar os outros blocos', async () => {
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/tasks`, () =>
        HttpResponse.json({ detail: 'Falha isolada' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'MARIA OLIVEIRA/1' });
    await user.click(screen.getByRole('tab', { name: /Tarefas/ }));
    expect(await screen.findByText('Não foi possível carregar as Tarefas.')).toBeInTheDocument();
    expect(screen.getByText('Dados principais')).toBeInTheDocument();
  });
});
