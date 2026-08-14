# 18 — Testes

## Executado de verdade nesta rodada

| Suíte | Arquivo | Casos | Resultado |
|---|---|---|---|
| Unitário | `lib/api/client.spec.ts` | 8 | ✅ |
| Componente | `features/auth/components/login-form.spec.tsx` | 3 | ✅ |
| Unitário | `stores/office.store.spec.ts` | 8 | ✅ |
| Mutation/cache | `features/office/api/mutations.spec.tsx` | 2 | ✅ |
| Provider/cross-tab | `providers/office-provider.spec.tsx` | 2 | ✅ |
| Componente | `features/office/components/workspace-switcher.spec.tsx` | 3 | ✅ |
| **Total** | 6 suítes | **26 casos** | **26/26 ✅** |

Comando usado: `npx vitest run` (a partir de `apps/web/`). Resultado real,
não projetado — capturado neste ambiente. As 4 suítes novas cobrem
exatamente os casos pedidos para o Office Context: troca de escritório
(sucesso e falha 403), limpeza de cache (`queryClient.getQueryCache().getAll()`
verificado vazio após sucesso, intacto após falha), sincronização entre
abas (`BroadcastChannel` real — Node 18+ expõe a API globalmente, usada
tal qual em produção, não um mock), ausência de escritório (`hydrateFromMe`
sem `escritorio.id`) e degradação para "um único escritório" num reload
sem login nesta aba.

**Infraestrutura de teste criada:** `vitest.config.ts` (jsdom, alias `@/`,
`clearMocks: true`), `src/test/setup.ts` (MSW lifecycle, polyfills de
`ResizeObserver`/`matchMedia` ausentes em jsdom), `src/test/render.tsx`
(`renderWithProviders` — `QueryClientProvider` fresco por teste, retry
desligado), `src/mocks/server.ts` + `src/mocks/handlers/identity.ts`
(handlers reais para os 6 endpoints de Identity usados nesta rodada).

## Não executado nesta rodada

- **Testes de componente** para `RegisterForm`, `ForgotPasswordForm`,
  `ResetPasswordForm` — escritos os componentes, não os testes (só
  `LoginForm` foi coberto, como demonstração do padrão).
- **Integração** (página inteira + TanStack Query real + MSW,
  `docs/frontend/27-tests.md §27.4`) — 0 escritos.
- **E2E (Playwright)** — 0 escritos. `@playwright/test` instalado,
  `playwright.config.ts` não criado.
- **Acessibilidade automatizada** (`@axe-core/playwright`) — não
  configurada.
- **Cobertura** (`vitest run --coverage`) — não medida nesta rodada
  (seria enganosa dado o recorte pequeno do que existe).

---

**Anterior:** [17-ai.md](17-ai.md) · **Próximo:** [19-decisions.md](19-decisions.md)
