# UX Polish — Scroll Experience, Microinterações e Refinamento Visual (Prompt 14.5)

> **Sprint exclusivamente visual/de navegação.** Nenhuma entidade, rota,
> permissão, regra de negócio ou contrato de API foi criada, removida ou
> alterada nesta rodada — confirmado pela varredura final de `git diff`
> (só `apps/web/src/**`, nunca `apps/api/**`). Permission Engine,
> Configuration Engine, AI Orchestration Layer, Universal Search,
> Navigation Engine, Task Engine, Dashboard, Clientes, Processos e
> Documentos preservam exatamente o comportamento funcional que tinham
> antes desta Sprint.

## 1. Objetivo

Elevar a experiência de navegação do Quilombo Dev ao padrão dos SaaS de
referência (Linear, Notion, Slack, ClickUp, Figma, Vercel, GitHub) —
**comportamento**, nunca layout copiado. Três eixos:

1. Eliminar toda barra de rolagem tradicional, substituindo por
   scrollbars minimalistas que só aparecem durante o gesto.
2. Padronizar transições (150–250ms, nunca mais) em todo componente que
   monta/desmonta ou muda de estado.
3. Padronizar microinterações (hover, pressed, focus) nos primitivos
   compartilhados (`components/ui/*`), o que as propaga automaticamente
   para todo o app sem tocar em cada tela.

## 2. FASE 0 — Mapeamento (o que foi encontrado antes de qualquer mudança)

Varredura de todo `apps/web/src` por `overflow-y-auto|overflow-x-auto|
overflow-auto` e por padrões de Card/Kanban/Tree/Timeline manuscritos.
Resultado:

| Categoria | Onde | Tratamento aplicado |
|---|---|---|
| Sidebar | `components/layout/sidebar-content.tsx` (`<nav>`) | `ScrollArea` (vertical) — comportamento completo do prompt |
| Kanban (board) | `features/tasks/components/task-kanban-page.tsx` | `ScrollArea` (horizontal + `dragToPan`) |
| Kanban (lista de cada coluna) | idem, 2 ocorrências (`CardContent` de status + "Sem status") | `.scrollbar-fade` direto (não precisa do JS completo) |
| Página inteira (`<main>`) | `components/layout/app-shell.tsx` | `.scrollbar-fade` |
| Tabelas | `components/ui/table.tsx` (`Table`) | `.scrollbar-fade` + header `sticky` |
| Diálogos com conteúdo longo | 6 arquivos (`deadline-form-dialog`, `client-form-dialog`, `task-templates-page`, `legal-case-form-dialog`, `task-form-dialog`, `create-role-dialog`) | `.scrollbar-fade` no `DialogContent` |
| Listas/paineis diversos | `ai-chat.tsx`, `search-preview-panel.tsx`, `document-preview.tsx`, `upload-dialog.tsx`, `command-palette.tsx`, `SelectContent`'s `Viewport` | `.scrollbar-fade` |
| Árvore de pastas | `features/folders/components/folder-tree*.tsx` | Sem container de scroll próprio hoje (cresce com a página, coberta pelo scroll do `<main>`) — nada a mudar estruturalmente; a animação de expandir/colapsar (que já existia mas era **morta**, ver §5) foi corrigida |
| Timeline | `features/timeline/`, `features/tasks/task-timeline-tab.tsx` | Sem container de scroll próprio (mesma razão acima); cards unificados para o primitivo `Card` (ver §4) |
| Dashboard | `features/dashboard/components/*` | Sem container de scroll próprio; cards herdam o hover padronizado do primitivo `Card` automaticamente |

**Reuso vs. duplicação (regra da FASE 0):** identificado que
`TimelineItemCard` (Processo) e o card de `TaskTimelineTab` (Tarefa,
somente leitura) reimplementavam manualmente o mesmo
`rounded-lg border border-border bg-card p-3` do primitivo `Card` —
generalizado: ambos agora renderizam `<Card>` diretamente. Não foram
unificados *entre si* (motivo documentado no próprio código: um tem
ações de fixar/excluir, o outro não — states diferentes, não vale a pena
uma abstração para isso).

## 3. Scrollbars

### 3.1 `.scrollbar-fade` (CSS puro, `styles/globals.css`)

Classe utilitária aplicada diretamente em qualquer container com overflow
que só precisa "aparecer no hover": `scrollbar-width: thin` +
`scrollbar-color: transparent` em repouso (Firefox), `::-webkit-scrollbar`
de 5px com `border-radius: 9999px` e `background-color: transparent`
(Chrome/Edge/Safari). No `:hover` (ou com o atributo `data-scroll-active`,
ver 3.2), a cor vira `color-mix(in srgb, var(--color-neutral-500) 45%,
transparent)` (dark: `neutral-400` a 40%) — sempre neutro, nunca a cor da
marca, sem contraste exagerado. Transição de 200ms no
`background-color` do thumb (suportada nativamente pelo WebKit).

### 3.2 `ScrollArea` (`components/data-display/scroll-area.tsx`, novo)

Componente genérico para os dois casos que o prompt descreve com
comportamento dedicado — **generalizado uma única vez, usado nos dois
lugares** (FASE 0: nunca duplicar):

- **Sidebar** (`orientation="vertical"`): scrollbar invisível em repouso,
  aparece no hover (`onMouseEnter`) e durante o scroll
  (`data-scroll-active`, ativado em `onScroll`/`onWheel` e desligado
  900ms depois do último evento — o "fade out ao parar" do prompt).
- **Kanban** (`orientation="horizontal" dragToPan`): mesma revelação, mais
  duas capacidades:
  - **Wheel vertical → scroll horizontal**: roda do mouse (sem Shift)
    move o board lateralmente (`Shift+Wheel` e trackpad horizontal já
    funcionam nativamente no navegador, sem necessidade de JS).
  - **`dragToPan`**: `mousedown` no próprio fundo do container (nunca em
    um cartão — checado via `event.target === event.currentTarget`, o que
    nunca é verdade para um clique num `TaskCard` `draggable`) inicia um
    arrasto que rola o board; não interfere com o Drag and Drop nativo
    dos cartões (Prompt 14), que continua em `HTMLElement.draggable` +
    `dragstart`/`dragover`/`drop`.

Tabelas/diálogos/listas usam só `.scrollbar-fade` diretamente — não
precisam do estado JS de "ativo durante o gesto", então não pagam o custo
de um componente com listeners.

### 3.3 Tabelas

`components/ui/table.tsx`: `Table` aplica `.scrollbar-fade` no wrapper
`overflow-x-auto`; `TableHeader` virou `sticky top-0 z-10 bg-background`
(cabeçalho fixo ao rolar uma tabela alta). `TableRow` já tinha
`hover:bg-muted/50 transition-colors` — mantido (era o único ponto do
design system que já seguia exatamente o padrão pedido).

## 4. Cards

`components/ui/card.tsx` é o único primitivo de Card do app — qualquer
ajuste nele se propaga para todo lugar que o usa (Dashboard, Kanban,
Calendário, Timeline, painéis "Relacionados"/"Ações rápidas", etc.),
exatamente o efeito pedido por "nunca existir Card diferente dos demais".
Alterado uma vez: `transition-shadow` → `transition-all`, `hover:shadow-
elevation-2` mantido, `hover:-translate-y-0.5` adicionado (elevação leve,
2px, nunca mais que isso). Os dois cards manuscritos que reimplementavam
esse visual (`TimelineItemCard`, `TaskTimelineTab`) foram migrados para o
primitivo (§2).

## 5. Transições (Dialog/Sheet/Dropdown/Select/Tooltip/Tabs/Tree)

`tailwindcss-animate` nunca foi dependência do projeto — os únicos usos
de classes daquele vocabulário (`animate-in fade-in slide-in-from-top-1`,
em `folder-tree-item.tsx`) eram **classes mortas**: sem o plugin, o
Tailwind não gera nenhum utilitário para esses nomes, então a árvore de
pastas expandia/recolhia sem nenhuma animação, silenciosamente, desde que
foi escrita. Corrigido generalizando um pequeno vocabulário próprio em
`styles/globals.css` (`@layer utilities`), no mesmo espírito do plugin
(`data-state` do Radix decide qual `@keyframes` roda), sem adicionar
dependência nova:

| Classe | Uso | Efeito |
|---|---|---|
| `.transition-overlay` | `DialogOverlay`, `SheetOverlay` | fade 200ms/150ms (abre/fecha) |
| `.transition-dialog` | `DialogContent` | fade + scale 0.96→1, com a translação de centralização embutida no keyframe |
| `.transition-sheet-left` / `.transition-sheet-right` | `SheetContent` (conforme `side`) | slide 250ms/200ms |
| `.transition-popover` | `SelectContent` | fade + scale (sem `translateY`, para não conflitar com o offset estático `translate-y-1` do Radix Popper) |
| `.transition-dropdown` | `DropdownMenuContent`, `TooltipContent` | fade + scale + `translateY(-4px)` |
| `.transition-collapse` | `<ul>` de `FolderTreeItem` ao expandir | fade + `translateY(-4px)`, substitui as classes mortas |
| `.transition-fade-in` | `TabsContent` (a cada troca de aba), indicador ativo de `NavLink` | fade simples 150ms |

Duração sempre entre 100–250ms (nunca mais). Radix Primitives usa
internamente `@radix-ui/react-presence`: o elemento só sai do DOM depois
que a animação de `data-state="closed"` termina — funciona exatamente
como o plugin funcionaria, sem precisar dele.

`@media (prefers-reduced-motion: reduce)` desliga todas essas animações
de uma vez (`animation: none !important`) — um único bloco no fim do
arquivo, em vez de `motion-safe:` espalhado por componente.

## 6. Microinterações

- **Botões** (`components/ui/button.tsx`): `active:scale-[0.97]` (pressed
  discreto, sem ripple — o prompt pede explicitamente a ausência de
  ripple, e nunca existiu um aqui). Loading (`Loader2` girando) e disabled
  já existiam.
- **Inputs/Select** (`components/ui/input.tsx`, `select.tsx`):
  `hover:border-ring/50` novo (nada existia além do estado de foco);
  estado de erro (`aria-invalid:border-destructive`) já existia e ganhou
  `aria-invalid:hover:border-destructive` para não conflitar com o hover
  novo.
- **Itens de menu** (`DropdownMenuItem`, `SelectItem`): `transition-colors`
  adicionado (hover instantâneo antes, agora suave).
- **Indicador ativo da Sidebar** (`nav-link.tsx`): ganhou
  `.transition-fade-in` — antes aparecia sem transição ao trocar de rota.

Focus (`focus-visible:ring-2 focus-visible:ring-ring`) já era consistente
em todos os primitivos antes desta Sprint — nenhuma mudança necessária
(WCAG 2.1 AA preservado).

## 7. Kanban

Além do scroll (§3.2): cartão arrastado ganha `scale-[0.97]` + elevação
de sombra em vez de só opacidade (menos "achatado", mais "levantado" —
sensação de "pegar" o cartão); coluna em `dragover` já destacava borda —
mantido; **placeholder de drop** novo: uma faixa tracejada
(`.transition-collapse`) aparece no fim da lista da coluna sob o cursor
enquanto um cartão de outra coluna está sendo arrastado sobre ela, e some
ao sair/soltar. Não existe reordenação intra-coluna no modelo de dados
(`Tarefa` não tem campo de posição/ordem) — o placeholder sinaliza "vai
cair aqui" (fim da coluna), nunca um slot específico entre dois cartões,
para não prometer um comportamento que a API não sustenta.

## 8. O que foi deliberadamente **não** alterado

- **Árvore de pastas/documentos**: hoje cresce com a página, sem um
  container de scroll próprio — não foi criado um `max-height` artificial
  só para "ter algo para aplicar `.scrollbar-fade`"; isso seria uma
  mudança de comportamento (uma pasta com muitos itens hoje expande a
  página inteira, o usuário rola o `<main>`), fora do escopo "só visual".
- **Reordenação de cards dentro de uma coluna do Kanban**: sem campo de
  posição no modelo — fora do escopo (seria regra de negócio, proibida
  nesta Sprint).
- **Estado de "sucesso" em Input**: não existe nenhum consumidor desse
  estado hoje; adicionar um `success` não utilizado seria especular sobre
  um requisito futuro (contraria a diretriz de não introduzir código
  morto).
- **Auditoria visual manual em breakpoints reais de dispositivo**: sem um
  navegador com viewport controlável disponível neste ambiente de
  execução, a responsividade foi revisada por leitura de código (classes
  `sm:`/`lg:` já consistentes nos componentes tocados), não por captura de
  tela em cada breakpoint — ver pendência em `21-context-next-step.md`.

## 9. Arquivos

**Novo:** `components/data-display/scroll-area.tsx`.

**Modificados (CSS):** `styles/globals.css`.

**Modificados (primitivos, `components/ui/*`):** `card.tsx`, `button.tsx`,
`input.tsx`, `select.tsx`, `dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`,
`tooltip.tsx`, `tabs.tsx`, `table.tsx`.

**Modificados (layout):** `app-shell.tsx`, `sidebar-content.tsx`,
`nav-link.tsx`.

**Modificados (features):** `tasks/components/task-kanban-page.tsx`,
`tasks/components/task-timeline-tab.tsx`, `timeline/components/
timeline-item-card.tsx`, `folders/components/folder-tree-item.tsx`,
`deadlines/components/deadline-form-dialog.tsx`, `clients/components/
client-form-dialog.tsx`, `configuration/components/task-templates-
page.tsx`, `legal-cases/components/legal-case-form-dialog.tsx`, `tasks/
components/task-form-dialog.tsx`, `permissions/components/create-role-
dialog.tsx`, `ai/components/ai-chat.tsx`, `search/components/search-
preview-panel.tsx`, `documents/components/document-preview.tsx`,
`documents/components/upload-dialog.tsx`, `search/components/command-
palette.tsx`.

## 10. Pendências para a próxima Sprint

- Auditoria visual manual (captura de tela real) em Desktop/Notebook/
  Tablet/Mobile — este ambiente não tem um navegador com viewport
  controlável.
- Se a árvore de pastas crescer o suficiente para precisar de scroll
  próprio (hoje cresce com a página), aplicar `.scrollbar-fade` no
  container quando ele existir.
- Avaliar `@starting-style` (CSS nativo, Baseline 2024) como substituto
  ainda mais simples do sistema de `data-state` manual, se o baseline de
  navegadores suportado pelo projeto subir.
