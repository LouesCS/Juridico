# 03 — Multi-tenancy

## Implementado

- `TenantContextStorage` (`AsyncLocalStorage`) — `shared/infrastructure/database/tenant-context.ts`.
- `tenantScopedExtension` — filtra/injeta `escritorioId` automaticamente em
  15 modelos tenant-scoped; lança `MissingTenantContextError` se o contexto
  estiver ausente em leitura/escrita fora da exceção de bootstrap.
- `softDeleteExtension` — filtra `excluidoEm IS NULL` por padrão em 10
  modelos; converte `delete`/`deleteMany` em `update` carimbando `excluidoEm`.
- `PrismaService` — compõe as duas extensões; expõe
  `runInTenantTransaction` (SET LOCAL via `set_config`, parametrizado) e os
  dois escapes de bootstrap documentados em [19-decisions.md](19-decisions.md).
- `AuthContextMiddleware` — estabelece o `TenantContext` envolvendo `next()`
  (padrão correto de propagação de `AsyncLocalStorage` em Express/Nest).
- `JwtAuthGuard`/`PermissionGuard` — impõem a decisão de autenticação/
  autorização já resolvida pelo middleware.

## Verificado

- Teste unitário de `PermissionGuard`/`JwtAuthGuard` (mockado).
- Typecheck e build passam com as extensões compostas.

## PROMPT 5C, Etapa 2 — Row-Level Security (escrita, não executada)

**Migration escrita:** `prisma/migrations/20260731000001_enable_rls/migration.sql`.
Habilita `ENABLE`/`FORCE ROW LEVEL SECURITY` e cria policies
(`SELECT`/`INSERT`/`UPDATE`/`DELETE`) para os 15 modelos de
`TENANT_SCOPED_MODELS` + `escritorios` (por `id`), usando o predicado
`escritorio_id = current_setting('app.tenant_id', true)::uuid` — mesma
convenção já implementada em `PrismaService.runInTenantTransaction`
(`set_config` com escopo `LOCAL`, compatível com PgBouncer em transaction
pooling). As 6 tabelas satélite sem `escritorio_id` próprio (`processo_membro`,
`versoes_documento`, `comentario_mencao`, `processo_tag`, `documento_tag`,
`fontes_ia`) recebem policy via `EXISTS` contra a tabela pai — a mesma
proteção transitiva já documentada em `tenant-scoped.extension.ts`, agora
também como garantia de banco. `log_auditoria` recebe RLS por
`escritorio_id` (nullable) e um `REVOKE UPDATE, DELETE` best-effort para uma
role `app_runtime` (só executa se a role já existir).

**Risco crítico documentado na própria migration:** Postgres ignora RLS
para o dono da tabela mesmo com `FORCE ROW LEVEL SECURITY` — se a aplicação
conectar com o mesmo usuário que rodou as migrations (o padrão mais comum),
toda a RLS acima vira um no-op silencioso. É obrigatório, antes de produção,
criar uma role de runtime separada (`app_runtime`) sem `BYPASSRLS` e sem ser
dona das tabelas, e apontar o `DATABASE_URL` da aplicação para ela.

**Verificação real feita:** sanidade estrutural do SQL (contagem balanceada
de blocos `$$`/parênteses, sem executar), `prisma migrate diff --from-empty`
usado para gerar a migration inicial (não precisa de banco — ver
[02-database.md](02-database.md)). **Não foi possível rodar a migration
contra um Postgres real neste ambiente** — nenhuma ferramenta de parsing SQL
genérica (`node-sql-parser`, testado e descartado) entende blocos `DO $$`
de PL/pgSQL, então a validação real só é possível com Postgres de fato.

**Teste de integração escrito (não executado):**
`test/integration/tenant-isolation.spec.ts`, usando Testcontainers
(`@testcontainers/postgresql`, adicionado como devDependency) — sobe um
Postgres 16 real, roda `prisma migrate deploy` (aplica init + RLS), cria uma
role `app_runtime` separada do dono das tabelas (exatamente para não cair no
risco acima) e testa: Tenant A não lê/altera/exclui dado de Tenant B,
ausência de `app.tenant_id` bloqueia toda leitura, e a proteção transitiva
via `EXISTS` funciona para uma tabela satélite (`processo_tag`). Roda via
`npm run test:integration`, fora do `npm test` padrão (jest.config default
só aponta para `src/**/*.spec.ts`) — **passa no `tsc --noEmit`/`eslint`
(verificado), nunca foi executado de fato** (sem Docker neste ambiente).

## Não implementado / pendente

- **RLS aplicada contra Postgres real** — escrita e com teste pronto (acima),
  mas nunca executada. A tripla defesa documentada em
  `docs/database/01-estrategia-multitenancy.md` tem as 3 camadas *escritas*
  nesta rodada; só 2 (guard + extensão Prisma) estão *verificadas em
  execução*.
- **`ResourceAuthorizationService`/Policy genérica** — cada use case
  implementado nesta rodada (`UpdateMemberRoleUseCase`, `RemoveMemberUseCase`)
  já resolve sua própria regra de escopo inline; uma abstração de Policy
  reutilizável (como planejada em `docs/backend/06-autorizacao.md`) ainda não
  foi extraída — vale a pena fazer isso quando `LegalCases` (que tem a regra
  mais rica, segredo de justiça) for implementado.

---

**Anterior:** [02-database.md](02-database.md) · **Próximo:** [04-identity.md](04-identity.md)
