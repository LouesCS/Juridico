# 32 — Contexto Oficial para o Prompt 6B

## CONTEXTO OFICIAL PARA O PROMPT 6B

**Escopo desta etapa.** Arquitetura completa do frontend — nenhuma tela
foi implementada, nenhum código foi escrito. Este documento resume o que
a implementação (Prompt 6B) deve tratar como já decidido.

### Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
shadcn/ui + Radix · TanStack Query 5 · React Hook Form + Zod · Zustand
(uso restrito) · `nuqs` (estado de URL) · `openapi-typescript` ·
Vitest + React Testing Library (justificativa em
[27-tests.md §27.1](27-tests.md)) · Playwright · MSW · ESLint · Prettier.
`apps/web/` como app irmão de `apps/api/`, sem ferramenta de monorepo
nesta fase ([31-decisions.md §31.4](31-decisions.md)).

### Estrutura

Feature-first (`src/features/<dominio>/`, um por módulo de domínio),
`components/` só para o que é compartilhado por ≥2 features, `lib/` como
camada de infraestrutura sem regra de negócio, fronteiras de import
aplicadas por lint — árvore completa em
[02-estrutura-pastas.md](02-estrutura-pastas.md).

### Rotas

Árvore oficial (herdada de `docs/03-fluxos-e-telas.md §3.10`, detalhada
por rota em [03-rotas.md](03-rotas.md)): `(public)` (login, registro,
recuperação, convite, OAuth callback) · `(onboarding)` · `(app)`
(Dashboard, Processos + sub-rotas, Prazos agregado, Documentos, Clientes,
Busca, Notificações, Perfil, Admin).

### Autenticação e autorização

Cookies `httpOnly` (`access_token` 15min, `refresh_token` 7-30d,
`SameSite=Lax`) — **nunca** `localStorage`. `GET /me` hidratado no
`(app)/layout.tsx`. Refresh transparente com fila única (evita storm de
refresh), `SESSION_REVOKED` limpa tudo e redireciona. RBAC replicado só
na primeira etapa (permissão de ação, via `PermissionGate`/`RoleGate`/
`Can`) — autorização de recurso (segredo de justiça, confidencialidade)
**nunca** replicada no cliente, sempre um 404 idêntico não importa a
causa. Detalhe completo: [05](05-autenticacao.md)/[06](06-autorizacao.md).

### Contexto de escritório

Espelho em Zustand (`office.store`), nunca fonte de verdade (fonte é o
JWT). Troca de escritório → `queryClient.clear()` total + reabertura de
SSE + `BroadcastChannel` para sincronizar outras abas. Detalhe:
[07-office-context.md](07-office-context.md).

### Queries e mutations

TanStack Query, chaves **sempre** prefixadas `['office', officeId, ...]`
(correção registrada em [31-decisions.md §31.2](31-decisions.md) sobre
`docs/04`) — cada feature expõe `api/{keys,queries,mutations}.ts`.
`staleTime` 30s, `gcTime` 5min, retry 2 nunca em 4xx. Optimistic update
só numa lista fechada de ações de baixo risco (marcar lido, concluir
prazo, feedback de IA). Paginação por cursor em toda lista de volume.
Detalhe: [10-tanstack-query.md](10-tanstack-query.md).

### SSE

Um `SseManager` por sessão × escritório, cookie `httpOnly` +
`EventSource` nativo (`withCredentials: true`), nunca token em query
string. Duas conexões possíveis (notificações, resumo de IA em
andamento), cada uma com seu ciclo de vida. Fallback de proxy via Route
Handler (`app/api/sse/notifications/route.ts`) só se a conexão direta
falhar persistentemente. Detalhe: [20](20-notifications-sse.md)/[22](22-ai.md).

### Uploads

Presign → `PUT` direto ao storage (fora do cliente HTTP central) →
confirm com hash SHA-256 calculado client-side. Nunca sobrescreve versão
— sempre nova versão. Detalhe: [18-documents-folders.md §18.2](18-documents-folders.md).

### Erros

Tipo único `ApiError` (RFC 9457 + `timestamp`), mapeado por status/`code`
para campo de formulário, banner, toast ou `error.tsx`/`not-found.tsx`
conforme a tabela em [23-errors.md §23.3](23-errors.md).
`correlationId` sempre visível, nunca protagonista.

### Mocks

MSW cumpre papel duplo: desenvolvimento local (só os 9 módulos ainda sem
backend) e teste (todos os módulos, sempre). Handlers derivados dos
tipos gerados do OpenAPI. Detalhe: [28-mocks.md](28-mocks.md).

### Testes

Vitest (unitário/componente/integração) + Playwright (E2E, 14 jornadas
listadas em [27-tests.md §27.5](27-tests.md)) + axe-core (acessibilidade,
zero violação crítica no CI). Cobertura 70% global, 90% em validators e
schemas.

### Ordem recomendada de implementação (Prompt 6B)

Espelha a maturidade real do backend, não a ordem de aparição na UX:

1. **Bootstrap do projeto** (`apps/web/`, config, tokens do design
   system, `AppShell` vazio) + **Auth/Office/Team** (`features/auth`,
   `features/office`, `features/team`) — únicas três features
   integráveis ponta a ponta hoje, contra `apps/api/` real.
2. **Dashboard** (mockado onde os agregados não existem, real onde
   Identity/Offices/Memberships já bastam).
3. **Legal Cases** — assim que o backend priorizar este módulo
   (`docs/backend-implementation/20-context-next-step.md`), é a próxima
   feature com maior chance de virar integração real; até lá, contra
   MSW.
4. **Deadlines/Timeline, Documents/Folders, Comments/Tags** (nessa
   ordem, cada uma depende de Legal Cases já existir na tela).
5. **Notifications** (SSE), **Search**, **AI** — as três mais dependentes
   de infraestrutura ainda não implementada no backend (fila, storage,
   provider de IA).
6. **Users/Perfil completo, MFA, OAuth** — por último, dependem de
   endpoints de backend ainda não escritos.

### Dependências e limitações conhecidas

Registradas exaustivamente em [31-decisions.md](31-decisions.md):
9 de 13 módulos mock-only até o backend correspondente existir · RLS não
aplicada (não afeta o frontend diretamente, mas significa que testes de
integração ponta a ponta contra Postgres real ainda não são possíveis) ·
verificação de e-mail/MFA/OAuth sem endpoint real · agregados de
Dashboard, restauração de cliente, favoritos de busca e campo de resumo
desatualizado sem contrato — todos tratados como pendência explícita, não
como suposição silenciosa.

---

**Anterior:** [31-decisions.md](31-decisions.md) · **Início:** [00-resumo.md](00-resumo.md)
