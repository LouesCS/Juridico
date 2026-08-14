# 02 — Estrutura de Pastas

## 2.1 Árvore completa

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── login/page.tsx
│   │   │   ├── registro/page.tsx
│   │   │   ├── esqueci-senha/page.tsx
│   │   │   ├── redefinir-senha/[token]/page.tsx
│   │   │   ├── verificar-email/[token]/page.tsx
│   │   │   ├── convite/[token]/page.tsx
│   │   │   ├── auth/callback/[provedor]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (onboarding)/
│   │   │   ├── onboarding/escritorio/page.tsx
│   │   │   ├── onboarding/equipe/page.tsx
│   │   │   ├── onboarding/tour/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/                       # autenticado, dentro do AppShell
│   │   │   ├── layout.tsx               # AppShell: sidebar, topbar, providers
│   │   │   ├── page.tsx                 # Dashboard
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── processos/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── layout.tsx       # Header do processo + abas
│   │   │   │       ├── page.tsx         # Visão Geral
│   │   │   │       ├── timeline/page.tsx
│   │   │   │       ├── documentos/page.tsx
│   │   │   │       ├── prazos/page.tsx
│   │   │   │       ├── partes/page.tsx
│   │   │   │       ├── comentarios/page.tsx
│   │   │   │       ├── historico/page.tsx
│   │   │   │       └── editar/page.tsx
│   │   │   ├── prazos/page.tsx          # agregado (Dashboard "ver todos")
│   │   │   ├── documentos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── versoes/page.tsx
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── busca/page.tsx           # busca avançada (resultado completo)
│   │   │   ├── notificacoes/page.tsx
│   │   │   ├── perfil/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── preferencias/page.tsx
│   │   │   │   ├── seguranca/page.tsx
│   │   │   │   └── privacidade/page.tsx
│   │   │   └── admin/
│   │   │       ├── escritorio/page.tsx
│   │   │       ├── usuarios/page.tsx
│   │   │       ├── perfis/page.tsx
│   │   │       ├── auditoria/page.tsx
│   │   │       ├── integracoes/page.tsx
│   │   │       └── faturamento/page.tsx
│   │   ├── api/                         # Route Handlers — lista fechada, ver 04-app-router.md §4.5
│   │   │   └── sse/
│   │   │       └── notifications/route.ts
│   │   ├── layout.tsx                   # Root: fontes, tema, providers globais
│   │   ├── not-found.tsx
│   │   └── global-error.tsx
│   │
│   ├── features/                        # ⭐ Coração da aplicação — um por módulo de domínio
│   │   ├── auth/                        # ↔ backend Identity (real)
│   │   ├── office/                      # ↔ backend Offices (real)
│   │   ├── team/                        # ↔ backend Memberships (real)
│   │   ├── dashboard/
│   │   ├── clients/                     # ↔ backend Clients (mock até existir)
│   │   ├── legal-cases/                 # ↔ backend Legal Cases (mock até existir)
│   │   ├── deadlines/                   # ↔ backend Legal Cases/Deadlines (mock)
│   │   ├── timeline/                    # ↔ backend Timeline (mock)
│   │   ├── documents/                   # ↔ backend Documents (mock)
│   │   ├── folders/                     # ↔ backend Documents/Folders (mock)
│   │   ├── comments/                    # ↔ backend Comments (mock)
│   │   ├── tags/                        # ↔ backend Tags (mock)
│   │   ├── notifications/               # ↔ backend Notifications (mock)
│   │   ├── search/                      # ↔ backend Search (mock)
│   │   ├── ai/                          # ↔ backend AI (mock)
│   │   ├── audit/                       # ↔ backend Audit (escrita real, leitura mock)
│   │   └── profile/                     # ↔ backend Users (mock) + Identity (real, sessões/senha)
│   │       # cada uma com:
│   │       # api/ (queries.ts, mutations.ts, keys.ts)
│   │       # components/
│   │       # hooks/
│   │       # schemas/         (Zod — validação de formulário, não tipagem de resposta)
│   │       # utils/
│   │       # index.ts          ⭐ API pública da feature
│   │
│   ├── components/                      # Compartilhado entre ≥2 features
│   │   ├── ui/                          # shadcn/ui — primitivos, não editar sem motivo
│   │   ├── layout/                      # AppShell, Sidebar, Topbar, PageHeader, WorkspaceSwitcher
│   │   ├── data-display/                # DataTable, EmptyState, Timeline, StatusBadge
│   │   ├── feedback/                    # Skeletons, ErrorState, Toaster, ConfirmDialog
│   │   ├── forms/                       # FormField, FileDropzone, DateRangePicker, TagPicker
│   │   └── auth/                        # PermissionGate, RoleGate, Can
│   │
│   ├── lib/                             # Infraestrutura sem regra de negócio
│   │   ├── api/
│   │   │   ├── client.ts                # fetch tipado central — ver 08-http-client.md
│   │   │   ├── errors.ts                # normalização de erro (RFC 9457 + timestamp)
│   │   │   ├── sse.ts                   # gerenciador de EventSource — ver 20-notifications-sse.md
│   │   │   └── generated/               # ⭐ tipos gerados do OpenAPI (nunca editados à mão)
│   │   ├── auth/                        # helpers de sessão (leitura de cookie no servidor)
│   │   ├── query/                       # QueryClient, defaults, factory de chaves
│   │   ├── permissions/                 # avaliação de `recurso:acao:escopo` no cliente
│   │   ├── utils/                       # cn(), formatadores, datas
│   │   └── validators/                  # CPF, CNPJ, OAB, CNJ — compartilhados entre schemas
│   │
│   ├── stores/                          # Zustand — só estado global de UI, ver 11-estado-global.md
│   │   ├── ui.store.ts                  # sidebar, densidade
│   │   ├── command-palette.store.ts
│   │   └── office.store.ts              # escritório ativo (espelho do cookie, nunca fonte)
│   │
│   ├── providers/                       # Composição de contextos client-side
│   │   ├── query-provider.tsx           # QueryClientProvider + hydration
│   │   ├── theme-provider.tsx           # next-themes
│   │   └── sse-provider.tsx             # ciclo de vida da conexão SSE ativa
│   │
│   ├── config/
│   │   ├── site.ts
│   │   ├── navigation.ts                # menu derivado de permissões
│   │   └── env.ts                       # validação de env com Zod (falha no boot)
│   │
│   ├── hooks/                           # Hooks genéricos, sem domínio
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   ├── use-hotkey.ts
│   │   └── use-permission.ts
│   │
│   ├── schemas/                         # Zod compartilhado entre ≥2 features (ex.: endereço, telefone)
│   │
│   ├── types/
│   │   └── global.d.ts
│   │
│   ├── mocks/                           # MSW — ver 28-mocks.md
│   │   ├── handlers/                    # um arquivo por módulo, espelha features/
│   │   ├── browser.ts
│   │   ├── server.ts                    # usado em testes (Vitest) e Playwright
│   │   └── scenarios/                   # cenários de erro/vazio/paginação por endpoint
│   │
│   ├── test/                            # setup e utilitários de teste — ver 27-tests.md
│   │   ├── setup.ts
│   │   ├── render.tsx                   # render com providers (Query, tema, MSW)
│   │   └── factories/                   # um factory por entidade de domínio
│   │
│   ├── styles/globals.css               # tokens do design system — ver 13-design-system.md
│   └── middleware.ts                    # sessão, tenant, headers — ver 04-app-router.md §4.4
│
├── e2e/                                  # Playwright
├── public/
└── (configs: next.config.ts, tailwind.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts)
```

## 2.2 Reconciliação com a árvore sugerida no Prompt 6A

O Prompt 6A sugeriu uma árvore com `modules/`, `services/`, `schemas/`,
`providers/`, `mocks/`, `test/` no nível raiz de `src/`. `docs/04` já havia
decidido `features/` como unidade organizadora (não `modules/`) com
`api/`/`schemas/` **dentro** de cada feature, não como pasta compartilhada
única. Reconciliação (decisão registrada em
[31-decisions.md §31.3](31-decisions.md)):

| Pasta sugerida no Prompt 6A | Onde vive de fato | Por quê |
|---|---|---|
| `modules/` | `features/<dominio>/` | Nome já fixado em `docs/04`; mesmo conceito |
| `services/` | `features/<dominio>/api/` | Chamada de API já vive junto do domínio que a usa, não separada |
| `schemas/` (todo o app) | `features/<dominio>/schemas/` (specific) + `src/schemas/` (compartilhado entre ≥2 features) | Schema de formulário é acoplado ao domínio; só o realmente cross-domain (endereço, telefone) sobe |
| `providers/` | `src/providers/` | Não existia explicitamente em `docs/04` (implícito em `app/layout.tsx`) — adicionado, não conflita |
| `mocks/` | `src/mocks/` | Idem — adicionado, não conflita |
| `test/` | `src/test/` | Idem — adicionado, não conflita |
| `types/` | `src/types/` (globais) + `lib/api/generated/` (gerados) + tipo local por feature quando não é gerado nem global | Mantido, com a fonte gerada isolada em subpasta própria |

## 2.3 Onde ficam schemas, tipos, queries e mutations — regra objetiva

- **Tipos derivados do OpenAPI:** exclusivamente `lib/api/generated/` — nunca
  editados à mão, sempre regenerados (ver [09-openapi.md](09-openapi.md)).
- **Schemas Zod de formulário:** `features/<dominio>/schemas/` — validam
  entrada do usuário (mensagens em português, máscara, checksum de
  CPF/CNJ), papel **distinto** dos tipos gerados (que tipam a resposta da
  API). Um não substitui o outro — ver [09-openapi.md §9.4](09-openapi.md).
- **Queries e mutations:** `features/<dominio>/api/queries.ts` e
  `mutations.ts`, usando chaves de `features/<dominio>/api/keys.ts` — ver
  [10-tanstack-query.md](10-tanstack-query.md).
- **Hooks específicos de domínio:** `features/<dominio>/hooks/` (ex.:
  `use-case-filters.ts` sincronizado com a URL via `nuqs`); hooks
  genéricos sem domínio ficam em `src/hooks/`.

## 2.4 Como evitar dependência circular

1. Lint de fronteira (§1.4 em [01-arquitetura.md](01-arquitetura.md)) é a
   defesa primária — quebra o build, não depende de revisão humana.
2. `features/A` que precisa de dado de `features/B` importa **apenas** o
   `index.ts` de B (ex.: `legal-cases` precisa saber o nome do cliente:
   importa `clients` via `index.ts`, nunca `clients/components/client-row.tsx`
   diretamente).
3. Quando duas features precisam do mesmo componente visual (ex.:
   `ClientPicker` usado por `legal-cases` e por `documents`), o componente
   sobe para `components/forms/` — deixa de pertencer a uma feature.
4. Nenhuma feature importa `app/` (a direção é sempre `app` → `features`,
   nunca o inverso).

---

**Anterior:** [01-arquitetura.md](01-arquitetura.md) · **Próximo:** [03-rotas.md](03-rotas.md)
