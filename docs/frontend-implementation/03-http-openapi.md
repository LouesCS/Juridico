# 03 — Cliente HTTP e OpenAPI

## Implementado e testado

`src/lib/api/client.ts` — `fetch` nativo, `credentials: 'include'`,
`X-Correlation-Id` gerado por operação, `Idempotency-Key` automático em
`POST` de escrita significativa (lista fechada em `IDEMPOTENT_WRITE_PATHS`),
timeout de 30s via `AbortSignal.timeout` combinado com o `signal` do
chamador via `AbortSignal.any`, fila de refresh única (`ensureFreshSession`,
evita refresh storm), normalização de todo erro para o tipo único
`ApiError` (`src/lib/api/errors.ts`), reenvio automático **uma única vez**
em `401 TOKEN_EXPIRED` após refresh bem-sucedido, emissão de evento
`session-revoked` (`src/lib/api/auth-events.ts`, desacoplado de
`features/auth` via `EventTarget` — reafirma a regra de fronteira
`lib/` → nunca `features/`) em `401` não recuperável.

**8 testes reais** em `client.spec.ts`: GET com credentials/correlation
ID, serialização de query params, `204` → `undefined`, erro normalizado,
falha de rede, fluxo completo de refresh (mock de 3 chamadas
`fetch` consecutivas), emissão do evento de sessão revogada,
`Idempotency-Key` em `POST /auth/register`.

## Verificado de fato

`npx vitest run src/lib/api/client.spec.ts` — 8/8 passando.

## Não implementado / pendente

- **Geração de tipos via `openapi-typescript`** (`docs/frontend/09-openapi.md`)
  — depende de um `openapi.json` real servido pelo backend
  (`apps/api/src/main.ts` já expõe Swagger em `/api/v1/docs`), que por
  sua vez exige o processo NestJS de pé, que por sua vez exige Postgres
  (`PrismaService.onModuleInit` conecta no boot) — não disponível neste
  ambiente. Os tipos usados em `features/auth/api/auth.api.ts`
  (`CurrentUserDTO`, `LoginResponseDTO`, `RegisterResponseDTO`) foram
  escritos manualmente, espelhando campo a campo os DTOs reais em
  `apps/api/src/modules/identity/application/use-cases/*.ts` — solução
  interina explícita, não uma alegação de que o pipeline de geração já
  funciona. Registrado como pendência prioritária em
  [19-decisions.md §19.2](19-decisions.md).
- Script `scripts/generate-api-types.ts` referenciado em
  `package.json` (`npm run generate:types`) — **não criado ainda** (o
  script só faria sentido, e só pode ser verificado de fato, quando
  houver um `openapi.json` real para apontar).
- Detecção de breaking changes em CI (`docs/frontend/09-openapi.md §9.4`)
  — depende do pipeline de CI, não criado nesta rodada.

---

**Anterior:** [02-design-system.md](02-design-system.md) · **Próximo:** [04-auth.md](04-auth.md)
