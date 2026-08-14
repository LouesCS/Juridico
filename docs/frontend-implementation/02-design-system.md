# 02 — Design System

## Implementado e verificado

**Tokens** (`src/styles/globals.css`) — cores (brand/neutral/semânticas
incluindo `--ai`, exclusiva para conteúdo de IA), tipografia (`--font-sans`/
`--font-serif`/`--font-mono`), radii (`sm`/`md`/`lg`/`xl`), elevação (4
níveis via `--shadow-elevation-*`), tema claro/escuro via `[data-theme]` +
`.dark` (compatível com `next-themes`). Ponte `@theme inline` para as
utilities do Tailwind 4 lerem as variáveis semânticas que trocam por tema.

**Primitivos implementados** (`src/components/ui/`): `Button` (variantes
`default`/`secondary`/`outline`/`ghost`/`destructive`/`link`/`ai`,
suporte a `asChild` e `loading`), `Input`, `Label`, `Checkbox`, `Card`
(+ `CardHeader`/`Title`/`Description`/`Content`/`Footer`), `Skeleton`,
`Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`
(wiring de acessibilidade RHF↔ARIA), `Toaster` (sonner). Adicionados na
etapa de Office Context/App Shell (Prompt 6C): `DropdownMenu` (+ `Item`,
`CheckboxItem`, `Label`, `Separator`, sobre `@radix-ui/react-dropdown-menu`),
`Avatar` (+ `Image`/`Fallback`, sobre `@radix-ui/react-avatar`),
`Separator` (sem dependência do Radix — `@radix-ui/react-separator` não
está instalado, `role="separator"` manual cobre a mesma semântica),
`Sheet` (drawer lateral sobre `@radix-ui/react-dialog`, usado no menu
mobile do App Shell), `Badge` (variantes `default`/`secondary`/`outline`/
`destructive`/`success`/`ai`, cva puro, sem Radix).

Adicionados na etapa de Team/Dashboard/Profile (segunda rodada do Prompt
6C): `Select` (sobre `@radix-ui/react-select`, usado no papel do membro
e filtro de status), `Dialog` (modal centralizado sobre
`@radix-ui/react-dialog`, distinto do `Sheet` lateral — base do
`ConfirmDialog` e do modal de convite), `Tabs` (sobre
`@radix-ui/react-tabs`, usado em Team e Profile), `Tooltip` (sobre
`@radix-ui/react-tooltip`, `TooltipProvider` montado uma vez em
`app/layout.tsx` — usado nas proteções do último Owner e nos "atalhos"
desabilitados), `Alert`/`AlertTitle`/`AlertDescription` (variantes
`default`/`destructive`/`warning`/`success`, cva puro, usado para os
avisos de indisponibilidade de MFA/edição de perfil), `Table`/
`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` (`<table>`
semântico simples, sem biblioteca de tabela).

**Compostos** (`components/data-display/`, `components/feedback/`,
`components/layout/`): `DataTable` (wrapper leve sobre `Table` — colunas
declarativas, loading via skeleton rows, `emptyState` — não uma solução
de sort/paginação client-side, nenhuma tela ainda precisa disso),
`FilterBar`, `StatusBadge` (mapeia `StatusMembro`/`StatusConvite` reais
do backend para variante+label), `PageHeader`, `EmptyState`,
`ErrorState`, `ConfirmDialog`.

**`components/feedback/`:** `Toaster`, `MockBanner` (indicador obrigatório
de que a sessão está rodando com MSW ligado, reafirma a exigência
explícita do Prompt 6B §2).

## Verificado de fato

Renderização real via `next dev` (label/input/aria-describedby corretos
no HTML servido, ver `docs/frontend-implementation/00-status.md §0.4`).
Bug real encontrado e corrigido: `Slot` + `asChild` do `Button` (ver
[19-decisions.md §19.1](19-decisions.md)).

## Layout (Prompt 6C)

`AppShell`, `Sidebar` (via `sidebar-content.tsx` + `nav-link.tsx`),
`Topbar`, `WorkspaceSwitcher` implementados — ver
[06-shell-navigation.md](06-shell-navigation.md) e
[05-office-context.md](05-office-context.md). `Breadcrumbs` ainda não
(árvore de rotas rasa demais para justificar nesta rodada).

## Não implementado / pendente

Do catálogo de ~35 componentes documentado em
`docs/frontend/13-design-system.md §13.4`, faltam ainda: `Radio`,
`Switch`, `Textarea`, `AlertDialog`, `Popover`, `Calendar`, `Command`/
`Combobox` (primitivos) e os compostos ainda não usados por nenhuma tela
real (`UserPicker`, `ClientPicker`, `CasePicker`, `TagPicker`,
`FileUploader`, `TimelineItem`, `DeadlineCard`, `DocumentCard`,
`AIStatusCard`, `PermissionGate`, `RoleGate`, `Can`, `Breadcrumb`,
`Pagination`). Cada um nasce junto com o módulo que o usa primeiro,
seguindo a ordem obrigatória — a navegação e as telas de Team/Dashboard/
Profile usam `usePermission`/`useAnyPermission` diretamente, em vez do
componente `PermissionGate` (mesma checagem, sem o wrapper JSX ainda).

---

**Anterior:** [01-bootstrap.md](01-bootstrap.md) · **Próximo:** [03-http-openapi.md](03-http-openapi.md)
