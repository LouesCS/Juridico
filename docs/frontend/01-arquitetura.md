# 01 — Arquitetura Geral

## 1.1 Ponto de partida: nada aqui redecide `docs/04-arquitetura-frontend.md`

`docs/04-arquitetura-frontend.md` (Stage 1, já oficial) já fixou a stack, os
princípios e uma estrutura de pastas feature-first. Esta pasta **eleva**
essa decisão ao nível de projeto executável — não a substitui. Onde os dois
documentos conversam, `docs/04` vence; onde `docs/04` é omisso (troca de
escritório, SSE, contexto de tenant, geração de tipos do OpenAPI, mocks),
esta pasta preenche a lacuna. As duas únicas correções propostas a
`docs/04` estão registradas como decisões formais em
[31-decisions.md §31.2 e §31.3](31-decisions.md) (chaves de query sem
`officeId` — risco real de vazamento de cache entre tenants — e
reconciliação da árvore de pastas do Prompt 6A com `features/` já
decidido), não alteradas silenciosamente aqui.

## 1.2 Stack (reafirmada de `docs/04` §4, sem mudança)

Next.js 15 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS 4
· shadcn/ui + Radix · TanStack Query 5 · React Hook Form + Zod · Zustand
(uso restrito, ver [11-estado-global.md](11-estado-global.md)) · `nuqs`
(estado de URL) · `openapi-typescript` (tipos do contrato, ver
[09-openapi.md](09-openapi.md)) · Vitest + React Testing Library +
Playwright (justificativa em [27-tests.md §27.1](27-tests.md)) · MSW ·
ESLint · Prettier.

## 1.3 Princípios arquiteturais (reafirmados de `docs/04` §4.1)

1. **Server-first.** RSC por padrão; `"use client"` é exceção justificada.
2. **Feature-first, não type-first.** Organização por domínio
   (`features/legal-cases`), não por tipo de artefato.
3. **Fronteiras explícitas.** Uma feature só expõe o que está no seu
   `index.ts`; import entre features passa pela API pública.
4. **Estado no lugar certo.** Servidor ≠ URL ≠ estado global de UI ≠ estado
   local de componente — confundir isso é a principal fonte de
   complexidade acidental em React (reafirma [10](10-tanstack-query.md),
   [11](11-estado-global.md)).
5. **Acessibilidade por construção.** Radix como base primitiva.
6. **Tipos derivados do contrato.** Nunca duplicar interface TypeScript à
   mão — sempre gerada do OpenAPI (reafirma [09](09-openapi.md)).

## 1.4 Camadas e o que cada uma pode importar

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `app/` | `features/*` (via `index.ts`), `components/`, `lib/`, `config/`, `providers/` | nada além disso — `app/` é composição pura, zero lógica de negócio |
| `features/<nome>/` | `components/`, `lib/`, `config/`, `hooks/` genéricos, `schemas/` compartilhados | outra `features/<outro>/` diretamente (só via `index.ts` dela) |
| `components/` | `lib/`, `hooks/` genéricos | `features/*` — um componente compartilhado nunca conhece domínio |
| `lib/` | nada de `features/` ou `components/` | é a camada mais baixa: puro TypeScript/infra |
| `stores/` | `lib/` | `features/*` diretamente (a feature consome a store, não o contrário) |
| `mocks/` | `lib/api/generated` (tipos) | `features/*` — handlers MSW são genéricos por endpoint, não por tela |

Aplicado via `eslint-plugin-boundaries`/`import/no-restricted-paths` no CI
(reafirma [30-ci.md](30-ci.md)) — regra de lint, não combinado verbal
(mesma justificativa de `docs/04` §4.2).

## 1.5 Por que módulo de domínio (não por tipo de tela)

Cada `features/<dominio>/` corresponde a um dos 13 módulos de conteúdo do
backend (Users, Clients, Legal Cases, Deadlines/Timeline, Documents/
Folders, Comments/Tags, Notifications, AI, Search) mais os módulos
transversais já reais (Identity→`auth`, Offices→`office`,
Memberships→`team`). Isso significa que **a maturidade da feature no
frontend pode — e deve — espelhar a maturidade do módulo correspondente no
backend**: `features/auth`, `features/office` e `features/team` são
implementáveis ponta a ponta desde o Prompt 6B; as demais nove features
são implementáveis contra contrato (tipos + MSW) e trocam de mock para
integração real assim que o módulo de backend correspondente existir — ver
[31-decisions.md §31.1](31-decisions.md).

## 1.6 Server Components vs. Client Components — regra de decisão

| Situação | Escolha |
|---|---|
| Leitura de dado que não muda por interação do usuário na própria renderização | Server Component |
| Precisa de `useState`/`useEffect`/evento de clique/hover | Client Component |
| Precisa de API de browser (`EventSource`, `IntersectionObserver`, `localStorage` — usado só para preferências não sensíveis) | Client Component |
| Formulário com validação client-side antes do submit | Client Component (RHF exige) |
| Escrita simples sem necessidade de estado otimista client-side | Server Action |
| Endpoint que precisa rodar no servidor Next.js por segredo (nunca há segredo de API aqui — ver nota abaixo) | Route Handler |
| Toda requisição autenticada, tenant, correlationId | Middleware |

**Nota importante:** diferente de aplicações que escondem uma API key de
terceiro, o Quilombo Dev não tem segredo para esconder do cliente — o
próprio backend NestJS já é a autoridade e já valida tudo via cookie
httpOnly. Isso significa que **a maioria das leituras não precisa de Route
Handler intermediário**: Client Components chamam a API diretamente
(`credentials: 'include'`, mesmo-site, `SameSite=Lax` permite — ver
[08-http-client.md §8.2](08-http-client.md)). Route Handlers em
`app/api/` são reservados a um conjunto pequeno e explícito de casos — ver
[04-app-router.md §4.5](04-app-router.md).

## 1.7 Monorepo e gerenciador de pacotes

`apps/web/` como diretório irmão de `apps/api/` (já existente e real). Esta
etapa **não** introduz uma ferramenta de monorepo (Turborepo/pnpm
workspaces/Nx) — os dois apps continuam com `package.json` independentes,
como já é o caso hoje. Adotar uma ferramenta de monorepo é uma decisão de
DX que não afeta a arquitetura descrita aqui e fica como opção explícita
para quando houver dor real de duplicação (ex.: tipos gerados do OpenAPI
sendo copiados manualmente entre os dois apps) — ver
[31-decisions.md §31.4](31-decisions.md). Gerenciador de pacotes: `npm`,
por consistência com `apps/api/`.

---

**Anterior:** [00-resumo.md](00-resumo.md) · **Próximo:** [02-estrutura-pastas.md](02-estrutura-pastas.md)
