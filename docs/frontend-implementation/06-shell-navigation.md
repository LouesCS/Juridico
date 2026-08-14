# 06 — App Shell e Navegação

## Implementado e testado

`app/(app)/layout.tsx` substituiu o placeholder do Prompt 6B por um App
Shell real:

```text
src/components/layout/
  app-shell.tsx          # composição: Sidebar desktop + Sheet mobile + Topbar + main
  sidebar-content.tsx     # lista de navegação (compartilhada entre desktop e mobile)
  nav-link.tsx            # item de navegação com filtro de permissão + estado ativo
  topbar.tsx               # busca, notificações, colapso da sidebar, trigger mobile
src/config/navigation.ts  # itens de menu com anyOfPermissions (chaves reais do seed do backend)
src/hooks/use-permission.ts
src/lib/permissions/has-permission.ts
```

`WorkspaceSwitcher` (`features/office`) e `UserMenu` (`features/auth`)
são compostos em `app/(app)/layout.tsx`, não em `components/layout/` —
decisão deliberada para não violar a fronteira de
`docs/frontend/01-arquitetura.md §1.4` (`components/` nunca importa
`features/*`). `components/layout/*` só recebe esses dois via prop
(`workspaceSwitcher`, `userMenu`), nunca os importa diretamente. Registrado
em [19-decisions.md §19.9](19-decisions.md).

## Navegação por permissão — implementado conforme §6.3

`config/navigation.ts` usa as chaves reais seedadas em
`apps/api/prisma/seed.ts` (`case:read:all|team|assigned`,
`document:read:all|assigned`, `client:read`, `office:update`,
`member:*`, `audit:read`) — não inventadas. `NavLink` chama
`useAnyPermission` e retorna `null` (item ausente, nunca acinzentado) sem
nenhuma chamada de rede extra, lendo só `useCurrentUser().membro.permissions`
já em cache.

`/admin` tem proteção de rota própria (§6.5): componente client-side
checa `useAnyPermission` e redireciona para `/` com toast se não
autorizado — nunca 404 (a existência de `/admin` não é segredo).

## Responsividade e acessibilidade

- Sidebar fixa em telas `lg+` (`w-64`/`w-16` colapsada, estado em
  `stores/ui.store.ts`, persistido em `localStorage` — preferência
  puramente visual, reafirma `docs/frontend/11-estado-global.md §11.2`).
- Abaixo de `lg`, a Sidebar vira um drawer (`Sheet`, sobre
  `@radix-ui/react-dialog`) acionado pelo botão de menu da Topbar — foco
  preso, `Esc` fecha, `aria-modal`, tudo herdado do Radix Dialog.
- `NavLink` usa `aria-current="page"` no item ativo; ícones decorativos
  marcados `aria-hidden`; botões de ícone (menu mobile, colapsar sidebar,
  notificações) têm `aria-label`.

## Stubs de rota criados para não haver link morto

`/processos`, `/prazos`, `/documentos`, `/clientes`, `/busca`,
`/notificacoes`, `/perfil`, `/admin` existem como página real usando
`components/feedback/coming-soon.tsx` — texto explícito "módulo ainda não
implementado" com o link para a doc de status daquele módulo. **Nenhuma
lógica de negócio nessas páginas** — nem MSW, nem query, nem formulário.

## Não implementado nesta etapa

- Breadcrumbs — não construído; a árvore de rotas ainda não tem
  profundidade suficiente (só um nível abaixo de `/`) para justificar.
- Command Palette (⌘K) — pendente, é `features/search` (Etapa 17).
- Contador de notificações não lidas na Topbar — depende de
  `features/notifications` (Etapa 16), que não existe ainda; o sino é só
  um link para `/notificacoes`.
- `PageHeader`, `Breadcrumb`, `Tabs`, `Command`, `Combobox`,
  `ContextMenu` e os demais componentes compostos do catálogo completo de
  Design System (`docs/frontend/13-design-system.md`) — catálogo restante
  fica para quando os módulos que os consomem existirem.

---

**Anterior:** [05-office-context.md](05-office-context.md) · **Próximo:** [07-team.md](07-team.md)
