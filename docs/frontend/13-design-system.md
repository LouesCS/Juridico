# 13 — Design System

## 13.1 Fonte de verdade

Tokens e comportamento já estão integralmente decididos em
[`../07-design-system.md`](../07-design-system.md) (tokens base) e
[`../ux/12-design-system.md`](../ux/12-design-system.md) +
[`../ux/13-componentes.md`](../ux/13-componentes.md) (complemento e
catálogo). Este documento só traduz isso para a implementação técnica
(Tailwind + shadcn/ui) — nenhum valor de token é redecidido aqui.

## 13.2 Tokens → Tailwind

Todos os tokens semânticos (`--background`, `--primary`, `--success`,
`--warning`, `--danger`, `--info`, `--ai` e variantes `-foreground`/
`-subtle`) são CSS custom properties em `styles/globals.css`, mapeadas no
`tailwind.config.ts` via `theme.extend.colors` apontando para
`hsl(var(--token))` — **nunca** uma cor Tailwind crua (`bg-violet-500`) é
usada diretamente em componente de produto; sempre a variável semântica
(`bg-ai`, `text-ai-foreground`). Isso é o que torna a regra "violeta
exclusiva para conteúdo de IA" (`docs/ux/12-design-system.md §12.5`)
verificável por lint (`eslint-plugin-tailwindcss` com regra customizada
proibindo a paleta `violet-*`/`purple-*` fora de `--ai`) em vez de
depender de revisão manual.

| Token do design system | Mecanismo Tailwind |
|---|---|
| Cores semânticas | CSS vars + `theme.extend.colors` |
| Tipografia (`display`…`overline`) | `theme.extend.fontSize` com par `[tamanho, {lineHeight, fontWeight}]` |
| Espaçamento (escala 4px) | Escala padrão do Tailwind já é base-4, sem customização |
| Breakpoints (`sm 640…2xl 1536`) | Já são o default do Tailwind — sem customização |
| Radii (`sm 4…full`) | `theme.extend.borderRadius` |
| Elevação (5 níveis) | `theme.extend.boxShadow` (`elevation-1`…`elevation-4`), `elevation-0` = `shadow-none` |
| Motion (durações/easing) | `theme.extend.transitionDuration`/`transitionTimingFunction` + classe utilitária `motion-safe:` (respeita `prefers-reduced-motion` nativamente) |

Dark mode: classe `.dark` + `next-themes`, `disableTransitionOnChange`
para não animar a troca de tema inteira.

## 13.3 shadcn/ui como camada de primitivos

shadcn/ui (sobre Radix) fornece a **Camada 1 — Primitivos** já listada em
`docs/04 §4.6`: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`,
`Switch`, `Dialog`, `Sheet`, `Popover`, `Tooltip`, `DropdownMenu`, `Tabs`,
`Accordion`, `Avatar`, `Badge`, `Card`, `Table`, `Skeleton`, `Toast`,
`Command` (base do Command Palette), `Calendar`. Instalados via CLI do
shadcn (copiados para `components/ui/`, não uma dependência de pacote) —
**regra:** não editar o primitivo copiado para atender uma tela específica;
compor por cima em `components/` ou `features/*/components/`.

## 13.4 Catálogo completo — ~35 componentes, mapeados por camada e origem

### Primitivos de formulário (shadcn/ui direto)
`Button` (variantes `default`/`secondary`/`outline`/`ghost`/`destructive`/
`link`/**`ai`** — a variante `ai` é uma extensão nossa sobre o `Button` do
shadcn, único lugar onde a cor `--ai` aparece como fundo sólido) · `Input`
· `Textarea` · `Select` · `Checkbox` · `Switch`.

### Overlays (shadcn/ui direto ou levemente estendido)
`Dialog` (usado como base de `Modal`) · `Sheet` (base de `Drawer`) ·
`Toast` (`aria-live` já configurado pelo Radix Toast) · `Popover` ·
`DropdownMenu` · `Tooltip`.

### Estrutura e navegação
`Accordion` (shadcn) · `Tabs` (shadcn, usado no header do Processo) ·
`Sidebar` (composto nosso, `components/layout/`) · `Navbar`/`Topbar`
(composto nosso) · `Breadcrumb` (composto nosso sobre `nav`) ·
`Pagination` (shadcn, só para telas admin de baixo volume — reafirma
[10-tanstack-query.md §10.5](10-tanstack-query.md)) · `Search`
(page-local, composto nosso) · `Command Palette` (composto nosso sobre o
primitivo `Command` do shadcn).

### Exibição de dados
`Avatar` (shadcn) · `Badge` (shadcn, base de `StatusBadge`) · `Tag`
(composto nosso — diferente de `Badge`, é clicável/removível) · `Card`
(shadcn) · `Table` (shadcn, para Clientes/Admin) · `DataTable` (composto
nosso sobre `Table` + TanStack Table, para Processos/Documentos —
ordenação, seleção, colunas configuráveis, virtualização via TanStack
Virtual) · `Timeline`/`TimelineItem` (composto nosso, `features/timeline/`)
· `NotificationCard`/`NotificationItem` (composto nosso,
`features/notifications/`) · `ProcessCard` (composto nosso,
`features/legal-cases/`) · `ClientCard` (composto nosso,
`features/clients/`) · `DocumentCard`/`FileCard` (composto nosso,
`features/documents/`) · `Comment`/`CommentThread` (composto nosso,
`features/comments/`) · `Upload`/`Dropzone` (composto nosso,
`features/documents/`) · `AISummaryCard`/`AIPanel` (composto nosso,
`features/ai/` — único componente autorizado a usar `bg-ai-subtle` como
fundo de card inteiro).

### Layout
`AppShell` · `Sidebar` · `Topbar` · `WorkspaceSwitcher` · `Breadcrumbs` ·
`ContentContainer` · `SplitView` · `DetailPanel` — todos compostos
nossos, `components/layout/`.

### Feedback
`ConfirmDialog` (composto nosso sobre `Dialog`, variantes normal/perigosa
— perigosa exige digitar o nome da entidade, reafirma
`docs/ux/14-ux-writing.md`) · `EmptyState` (composto nosso, variantes
primeiro-uso/sem-resultado/erro/sem-permissão) · `Skeleton` (shadcn,
usado só para carregamentos >300ms — abaixo disso, indicador discreto em
vez de skeleton, reafirma `docs/ux/09-busca-global.md §9.13`).

Regra de governança (reafirma `docs/ux/19-decisoes.md §19.4` risco #1 —
volume de ~35 componentes gera inconsistência entre desenvolvedores):
todo componente composto novo passa pelo checklist de aceitação de
`docs/ux/18-checklists.md §18.3` antes de merge — estados
loading/empty/error, variantes de acessibilidade e responsividade
cobertos, não uma tela isolada aprovando visualmente.

## 13.5 Ícones e ilustrações

Lucide React (stroke 1.5px) — sem customização de biblioteca. Ilustrações
de `EmptyState` são SVG estático em `public/illustrations/`, 2 cores
(`foreground` + `accent`/`ai-subtle`), sem geração dinâmica.

---

**Anterior:** [12-formularios.md](12-formularios.md) · **Próximo:** [14-dashboard.md](14-dashboard.md)
