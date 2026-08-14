# 04 — Mapa de Navegação

> Expande a árvore de telas de [../03-fluxos-e-telas.md §3.10](../03-fluxos-e-telas.md)
> com modais, drawers, diálogos, menus e padrão de breadcrumb.

---

## 4.1 Estrutura de navegação persistente (presente em toda tela autenticada)

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar: [Logo/Escritório ▾]  [Busca ⌘K]  [🔔] [Avatar ▾]      │
├───────────┬───────────────────────────────────────────────────┤
│ Sidebar   │  Breadcrumb (quando aplicável)                    │
│           │  ─────────────────────────────────────────────    │
│ Dashboard │  Conteúdo da página                                │
│ Processos │                                                    │
│ Documentos│                                                    │
│ Clientes  │                                                    │
│ ────────  │                                                    │
│ Admin*    │                                                    │
└───────────┴───────────────────────────────────────────────────┘
```
`*` Item "Admin" só aparece para `OWNER`/`ADMIN` — item ausente, não
desabilitado, para papéis sem permissão (reafirma princípio de menor
privilégio; um item visível-mas-bloqueado convida a pergunta "por que não
posso?", um item ausente não gera essa fricção).

## 4.2 Árvore de telas (herdada, sem alteração)

Ver [../03-fluxos-e-telas.md §3.10](../03-fluxos-e-telas.md) para a árvore
completa de rotas. Esta seção não a repete — adiciona a camada de overlays.

## 4.3 Modais (bloqueiam interação com o fundo)

| Modal | Disparado de | Tamanho | Fecha com |
|---|---|---|---|
| Novo Cliente (rápido) | Botão "+" em qualquer lugar que referencie cliente | `md` (480px) | Esc, clique fora, Cancelar, Salvar |
| Convidar Membro | Admin > Usuários | `md` | Idem |
| Confirmação de ação destrutiva | Excluir processo/documento/cliente | `sm` (360px) | Apenas botão explícito (não fecha em clique fora, para evitar exclusão acidental) |
| Selecionar Escritório | Clique no seletor da Topbar quando há >1 escritório | `sm` | Esc, clique fora |
| Detalhe de Notificação com ação | Clique em notificação que requer confirmação (raro) | `sm` | Idem |
| Visualizador de Atalhos de Teclado (`?`) | Tecla `?` em qualquer tela | `lg` (640px) | Esc, clique fora |

## 4.4 Drawers (painel lateral deslizante, não bloqueia totalmente)

| Drawer | Disparado de | Lado | Conteúdo |
|---|---|---|---|
| Painel de Notificações | Ícone de sino na Topbar | Direita, 380px | Lista de notificações, ver [11-notificacoes.md](11-notificacoes.md) |
| Painel de Filtros Avançados | Botão "Filtros" em listas | Direita, 320px | Filtros de lista (Processos, Documentos, Clientes) |
| Detalhe Rápido de Documento | Clique em linha de tabela (não no título) | Direita, 480px | Preview + metadados sem sair da lista |
| Resumo por IA | Botão "Resumir com IA" na Tela do Processo | Direita, 420px (expansível) | Streaming de resumo, fontes, feedback |
| Novo Comentário com Menção | Atalho `@` dentro do campo de comentário | Inline (não é drawer — popover de autocomplete) | — |

## 4.5 Popovers e Dropdowns

| Elemento | Disparado de | Conteúdo |
|---|---|---|
| Menu do Usuário | Avatar na Topbar | Perfil, Preferências, Trocar Escritório, Sair |
| Menu de Ações de Linha | Ícone "⋮" em cards/linhas de tabela | Editar, Arquivar, Excluir, Duplicar (contextual por entidade) |
| Seletor de Papel | Formulário de convite/edição de membro | Lista de papéis disponíveis |
| Autocomplete de Cliente | Campo "Cliente" em formulário de processo | Busca + opção "Criar novo" inline |
| Autocomplete de Menção (`@`) | Campo de comentário | Lista de membros do processo |
| Seletor de Tags | Botão "+ tag" em processo/documento/cliente | Tags existentes + criar nova |

## 4.6 Diálogos de confirmação (subtipo de modal `sm`)

Sempre seguem o padrão do design system (`ConfirmDialog`,
[../07-design-system.md §7.6](../07-design-system.md)):

- **Normal** (arquivar, desvincular): botão de ação em `outline`, "Cancelar"
  como padrão focado.
- **Perigosa** (excluir permanentemente da lixeira, encerrar escritório):
  exige digitar o nome da entidade; botão de ação em `destructive`.

## 4.7 Toasts (feedback transitório, não navegação)

Aparecem no canto inferior direito (desktop) / topo (mobile), 4 segundos de
exibição padrão, empilháveis até 3 simultâneos. Usados para confirmação de
ação bem-sucedida sem necessidade de navegação (ex.: "Documento enviado",
"Comentário adicionado") — nunca para erro crítico, que usa estado inline
(ver [14-ux-writing.md](14-ux-writing.md)).

## 4.8 Padrão de Breadcrumb

Presente em toda tela a mais de um nível de profundidade da navegação
principal:

```
Processos / Ação Trabalhista — Cliente X / Documentos / contrato-v2.pdf
```

Regras:
- Cada segmento (exceto o último) é clicável.
- Segmento do processo mostra o título, não o UUID nem o número CNJ completo
  (que é longo demais para breadcrumb — CNJ aparece no header da tela).
- Em mobile, breadcrumb colapsa para "‹ Voltar" + título da tela anterior
  (reafirma [17-responsividade.md](17-responsividade.md)).

## 4.9 Navegação por teclado (mapa completo)

Reafirma e detalha [../03-fluxos-e-telas.md §3.12](../03-fluxos-e-telas.md):

| Tecla | Ação | Escopo |
|---|---|---|
| `Ctrl+K` / `⌘K` | Abrir busca global | Global |
| `G` então `D` | Ir para Dashboard | Global |
| `G` então `P` | Ir para Processos | Global |
| `G` então `A` | Ir para Documentos | Global |
| `G` então `C` | Ir para Clientes | Global |
| `N` | Novo (contextual: novo processo/documento/cliente conforme a tela) | Lista |
| `/` | Focar busca da página (busca local, diferente da global) | Lista |
| `?` | Abrir modal de atalhos | Global |
| `Esc` | Fechar overlay ativo (modal, drawer, popover) | Overlay aberto |
| `↑` `↓` | Navegar itens de lista/resultado | Lista, busca |
| `Enter` | Abrir item selecionado | Lista, busca |
| `Tab` | Avançar foco / trocar escopo de filtro na busca | Global |
| `Ctrl+Enter` | Enviar comentário/formulário sem clicar no botão | Formulário, comentário |

## 4.10 Estados de navegação inválida

- URL de processo/documento inexistente ou de outro tenant → tela 404 padrão
  (nunca 403 revelador, reafirma [../database/01-estrategia-multitenancy.md §1.6](../database/01-estrategia-multitenancy.md)),
  com botão "Voltar ao Dashboard".
- URL de recurso sob segredo de justiça sem permissão → mesma tela 404 —
  visualmente indistinguível de "não existe".
- Deep link para tela que exige escritório diferente do ativo → prompt de
  troca de escritório antes de renderizar o conteúdo.

---

**Anterior:** [03-user-journeys.md](03-user-journeys.md) · **Próximo:** [05-dashboard.md](05-dashboard.md)
