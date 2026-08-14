# 17 — Testes

## Executado de verdade nesta rodada

| Suíte | Arquivo | Casos | Resultado |
|---|---|---|---|
| Unitário | `common/guards/permission.guard.spec.ts` | 4 | ✅ |
| Unitário | `common/guards/jwt-auth.guard.spec.ts` | 6 | ✅ |
| Unitário | `common/filters/all-exceptions.filter.spec.ts` | 3 | ✅ |
| Unitário | `modules/identity/.../login.use-case.spec.ts` | 5 | ✅ |
| Unitário | `modules/identity/.../register.use-case.spec.ts` | 3 | ✅ |
| Unitário | `modules/memberships/.../update-member-role.use-case.spec.ts` | 5 | ✅ |
| Unitário | `modules/audit/application/sanitize-for-audit.spec.ts` | 5 | ✅ |
| Unitário | `modules/audit/application/audit.service.spec.ts` | 3 | ✅ |
| Unitário | `modules/audit/audit.interceptor.spec.ts` | 5 | ✅ |
| **Total** | 9 suítes | **38 casos** | **38/38 ✅** |

Comando usado: `npx jest` (a partir de `apps/api/`). Resultado real, não
projetado — capturado neste ambiente.

## Escrito nesta rodada, não executado (PROMPT 5C Etapa 2/3)

`test/integration/tenant-isolation.spec.ts` — suíte real de Testcontainers
(`@testcontainers/postgresql`, devDependency), roda via
`npm run test:integration` (config dedicada em `test/jest-integration.json`,
fora do `npm test` padrão). Sobe Postgres 16 real, aplica as 3 migrations
via `prisma migrate deploy`, cria uma role `app_runtime` separada da role
dona das tabelas (necessário — Postgres ignora RLS para o dono mesmo com
`FORCE ROW LEVEL SECURITY`) e testa isolamento de tenant fim a fim: leitura
cruzada, `UPDATE`/`DELETE` cruzados (devem afetar 0 linhas), ausência de
contexto bloqueando tudo, e proteção transitiva de uma tabela satélite
(`processo_tag`) via `EXISTS`. **Passa em `tsc --noEmit` e `eslint`
(verificado); nunca rodou de fato** — sem Docker neste ambiente, `npm run
test:integration` não pôde ser executado.

## Não executado nesta rodada (requer infraestrutura ausente)

- **Integração contra Postgres real** — suíte de isolamento de tenant
  escrita (acima); demais repositórios Prisma ainda sem teste de integração
  dedicado. Requer Docker.
- **E2E** (8 fluxos críticos via Supertest contra a API completa) — 0
  escritos. Requer Postgres + Redis reais.
- **Segurança** (isolamento entre tenants, IDOR, reuso de refresh token via
  chamada HTTP real, rate limiting) — a lógica existe (ex.: detecção de
  reuso em `RefreshTokenUseCase`) mas não há teste de integração exercitando
  o caminho completo.
- **Contract testing** (Dredd/schemathesis contra o OpenAPI gerado) — não
  configurado.

## Cobertura

Não medida via `--coverage` nesta rodada (seria enganosa dado que 3 dos 17
módulos foram implementados) — métrica relevante fica para quando houver
mais módulos para comparar.

---

**Anterior:** [16-observability.md](16-observability.md) · **Próximo:** [18-docker-ci.md](18-docker-ci.md)
