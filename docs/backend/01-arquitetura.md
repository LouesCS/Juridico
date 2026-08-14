# 01 — Arquitetura e Estrutura de Pastas

> Reafirma monólito modular + Clean Architecture pragmática de
> [../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md). Aqui:
> a árvore de diretórios completa do projeto NestJS.

## 1.1 Monólito modular (reafirmado)

Um único processo de aplicação (mais os workers, mesmo código-fonte),
dividido em módulos NestJS com fronteira de import disciplinada — não
microsserviços. Justificativa inalterada:
[../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md).

## 1.2 Árvore de diretórios completa

```
apps/api/src/
├── modules/
│   ├── identity/
│   ├── office/
│   ├── membership/
│   ├── users/
│   ├── clients/
│   ├── legal-cases/
│   ├── timeline/
│   ├── deadlines/
│   ├── documents/
│   ├── folders/
│   ├── comments/
│   ├── tags/
│   ├── search/
│   ├── ai/
│   ├── notifications/
│   ├── audit/
│   └── health/
│
├── shared/                          # Módulo transversal, sem regra de negócio própria
│   ├── domain/
│   │   ├── entity.base.ts
│   │   ├── aggregate-root.base.ts
│   │   ├── value-object.base.ts
│   │   ├── domain-event.base.ts
│   │   └── result.ts
│   ├── application/
│   │   ├── use-case.interface.ts
│   │   ├── paginated-result.ts
│   │   └── unit-of-work.interface.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   ├── tenant-context.storage.ts        # AsyncLocalStorage
│   │   │   ├── extensions/
│   │   │   │   ├── tenant-scoped.extension.ts
│   │   │   │   └── soft-delete.extension.ts
│   │   │   └── base-tenant.repository.ts
│   │   ├── cache/redis.service.ts
│   │   ├── queue/                    # base de processors BullMQ
│   │   ├── storage/                  # StorageService + adapters (07-storage.md)
│   │   ├── mail/                     # MailService + adapters (02-modulos.md §Shared)
│   │   ├── ai/                       # AIProvider + adapters
│   │   └── telemetry/                # logger, tracing, métricas
│   └── events/
│       └── outbox.entity.ts
│
├── common/                           # Transversal de apresentação (não de domínio)
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── tenant.decorator.ts
│   │   ├── require-permission.decorator.ts
│   │   └── audit.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── tenant.guard.ts
│   │   ├── permission.guard.ts
│   │   └── throttle.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   ├── google.strategy.ts
│   │   ├── microsoft.strategy.ts
│   │   └── local.strategy.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform-response.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   └── audit.interceptor.ts
│   ├── filters/
│   │   ├── all-exceptions.filter.ts
│   │   └── domain-exception.filter.ts
│   ├── pipes/
│   │   └── zod-validation.pipe.ts
│   ├── middlewares/
│   │   └── correlation-id.middleware.ts
│   └── validators/
│       ├── cnj.validator.ts
│       ├── cpf-cnpj.validator.ts
│       └── e164-phone.validator.ts
│
├── config/
│   ├── env.schema.ts                 # Zod — falha o boot se env inválida
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   ├── storage.config.ts
│   ├── mail.config.ts
│   └── ai.config.ts
│
├── jobs/                             # Entry point dos workers (mesmo código-fonte)
│   ├── documents.worker.ts
│   ├── search.worker.ts
│   ├── ai.worker.ts
│   ├── notifications.worker.ts
│   └── maintenance.worker.ts
│
├── health/
│   └── health.module.ts
│
├── app.module.ts
└── main.ts
```

Cada `modules/<nome>/` segue a anatomia de 4 camadas detalhada em
[03-camadas.md](03-camadas.md), idêntica em estrutura ao exemplo de
`cases` já dado em
[../05-arquitetura-backend.md §5.2](../05-arquitetura-backend.md) — esta
pasta generaliza esse exemplo para os 17 módulos de domínio.

## 1.3 Onde cada conceito do prompt vive

| Conceito pedido | Localização |
|---|---|
| Interfaces | `domain/repositories/*.repository.ts` (contratos), `application/ports/*.port.ts` |
| DTOs | `presentation/dtos/*.dto.ts` (schemas Zod, reafirma [../api/19-openapi.md §19.8](../api/19-openapi.md)) |
| Repositories | `infrastructure/repositories/prisma-*.repository.ts` |
| Services (de aplicação) | `application/use-cases/*.use-case.ts` — um arquivo por intenção, não um `*.service.ts` genérico |
| Services (de infraestrutura) | `shared/infrastructure/{storage,mail,cache,ai}/*.service.ts` |
| Factories | `domain/factories/*.factory.ts` — construção de agregados com invariante validada na criação (ex.: `ProcessoFactory.criar(...)`) |
| Policies | `modules/<nome>/application/policies/*.policy.ts` — autorização de recurso (ver [06-autorizacao.md](06-autorizacao.md)) |
| Guards | `common/guards/*.guard.ts` |
| Strategies | `common/strategies/*.strategy.ts` (Passport) |
| Middlewares | `common/middlewares/*.middleware.ts` |
| Filters | `common/filters/*.filter.ts` |
| Interceptors | `common/interceptors/*.interceptor.ts` |
| Decorators | `common/decorators/*.decorator.ts` |
| Validators | `common/validators/*.validator.ts` |
| Config | `config/*.config.ts`, validado por `env.schema.ts` no boot |
| Events | `shared/events/`, `modules/<nome>/domain/events/*.event.ts` |
| Queues | `shared/infrastructure/queue/`, `jobs/*.worker.ts` |
| Storage | `shared/infrastructure/storage/` |
| Observability | `shared/infrastructure/telemetry/` |
| Testing | `modules/<nome>/**/*.spec.ts` (unitário/integração), `test/e2e/*.e2e-spec.ts` |

## 1.4 Regra de import entre camadas (reafirmada)

`Interface/Presentation → Application → Domain ← Infrastructure` — a seta
sempre aponta para dentro; `Domain` não importa nada de `Infrastructure`,
`Application` ou `Presentation`. Reafirma
[../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md), aplicada
por regra de lint (`dependency-cruiser`) que falha o CI em violação.

---

**Anterior:** [00-resumo.md](00-resumo.md) · **Próximo:** [02-modulos.md](02-modulos.md)
