import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

/**
 * Regressão do bug de sobreposição em `TabsList` quando `className="flex-wrap"`
 * é aplicado (ex.: `client-detail-page.tsx`, `deadlines-page.tsx`,
 * `documents-page.tsx`, `search-advanced-page.tsx`, `task-detail-page.tsx`,
 * `legal-case-detail-page.tsx`). A causa raiz era `h-9` (altura fixa): ao
 * quebrar para 2+ linhas, a segunda linha ultrapassava a caixa e o
 * `TabsContent` (posicionado via `mt-4` a partir dessa altura fixa) ficava
 * sobreposto às abas da segunda linha. jsdom não calcula layout real
 * (flex-wrap/altura), então os testes abaixo cobrem o que é
 * deterministicamente verificável: o contrato de classes que impede a
 * regressão, a integridade estrutural (todas as abas, na mesma ordem) e o
 * comportamento funcional (seleção, navegação por teclado) — independente de
 * quantas linhas as abas ocupem visualmente.
 */

const LABELS = [
  'Resumo',
  'Dados Gerais',
  'Contato',
  'Endereço',
  'Documentos',
  'Comentários',
  'Timeline',
  'Processos',
  'Contratos',
  'Financeiro',
  'Serviços',
  'Tarefas',
  'Registros de Trabalho',
  'IA',
];

function ManyTabs() {
  return (
    <Tabs defaultValue={LABELS[0]}>
      <TabsList className="flex-wrap">
        {LABELS.map((label) => (
          <TabsTrigger key={label} value={label}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {LABELS.map((label) => (
        <TabsContent key={label} value={label}>
          Conteúdo de {label}
        </TabsContent>
      ))}
    </Tabs>
  );
}

describe('TabsList', () => {
  it('nunca aplica altura fixa (regressão do bug de sobreposição) — só min-h', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="flex-wrap">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole('tablist');
    expect(list.className).toMatch(/\bmin-h-9\b/);
    expect(list.className).not.toMatch(/(?<!min-)\bh-9\b/);
  });

  it('renderiza todas as abas, na mesma ordem, mesmo com muitas abas e flex-wrap', () => {
    render(<ManyTabs />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(LABELS.length);
    expect(tabs.map((tab) => tab.textContent)).toEqual(LABELS);
  });

  it('mantém a aba ativa corretamente marcada (aria-selected) independente da quebra de linha', async () => {
    const user = userEvent.setup();
    render(<ManyTabs />);

    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Registros de Trabalho' }));

    expect(screen.getByRole('tab', { name: 'Registros de Trabalho' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo de Registros de Trabalho');
  });

  it('preserva navegação por teclado (setas) entre abas na ordem lógica do DOM, não na posição visual', async () => {
    const user = userEvent.setup();
    render(<ManyTabs />);

    screen.getByRole('tab', { name: 'Resumo' }).focus();
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Dados Gerais' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();
  });
});
