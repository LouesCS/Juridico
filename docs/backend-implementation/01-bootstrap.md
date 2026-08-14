# 01 — Bootstrap

## Implementado

- `apps/api/src/main.ts`: prefixo global `/api/v1`, Helmet, compressão,
  `cookie-parser`, CORS restrito por `CORS_ORIGIN` com `credentials: true`,
  filtro global de exceções, limite de payload JSON (1 MB), Swagger em
  `/api/v1/docs` (apenas fora de produção), `enableShutdownHooks()`.
- `apps/api/src/config/env.schema.ts`: schema Zod completo, valida no boot
  (falha o processo se inválido) — inclui regra cruzada (`superRefine`) que
  proíbe `STORAGE_PROVIDER=local` e `COOKIE_SECURE=false` em produção.
- `.env.example` documentado com todas as chaves.
- `apps/api/src/app.module.ts`: registra os módulos implementados nesta
  rodada, aplica `CorrelationIdMiddleware` + `AuthContextMiddleware` a todas
  as rotas, registra `JwtAuthGuard`/`PermissionGuard` como `APP_GUARD` global.

## Não implementado / pendente

- Middleware de rate limiting (`@nestjs/throttler` está na dependência, mas
  não foi configurado nesta rodada).
- Verificação de que o processo sobe de fato contra um Postgres/Redis reais
  (não disponíveis neste ambiente).

---

**Anterior:** [00-status.md](00-status.md) · **Próximo:** [02-database.md](02-database.md)
