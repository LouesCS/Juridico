# 03 — Camadas (Domain, Application, Infrastructure, Presentation)

> Reafirma [../05-arquitetura-backend.md §5.1-5.3](../05-arquitetura-backend.md).
> Aqui: anatomia completa e regras de cada camada, generalizadas para
> qualquer módulo desta pasta.

## 3.1 Anatomia de um módulo (`modules/<nome>/`)

```
modules/legal-cases/
├── domain/
│   ├── entities/
│   │   ├── processo.entity.ts            # AggregateRoot
│   │   └── parte-processo.entity.ts
│   ├── value-objects/
│   │   ├── numero-cnj.vo.ts
│   │   ├── status-processo.vo.ts
│   │   └── valor-monetario.vo.ts
│   ├── events/
│   │   ├── processo-criado.event.ts
│   │   └── processo-status-alterado.event.ts
│   ├── errors/
│   │   └── cnj-duplicado.error.ts
│   ├── factories/
│   │   └── processo.factory.ts
│   └── repositories/
│       └── processo.repository.ts         # ⭐ INTERFACE (port)
│
├── application/
│   ├── use-cases/
│   │   ├── criar-processo.use-case.ts
│   │   ├── atualizar-processo.use-case.ts
│   │   ├── listar-processos.use-case.ts
│   │   ├── arquivar-processo.use-case.ts
│   │   └── atribuir-responsavel.use-case.ts
│   ├── policies/
│   │   └── processo-acesso.policy.ts       # autorização de recurso (06-autorizacao.md)
│   ├── ports/
│   │   └── (nenhum específico — usa os de shared/mail, shared/ai quando aplicável)
│   └── mappers/
│       └── processo.mapper.ts               # domínio ↔ persistência ↔ DTO de resposta
│
├── infrastructure/
│   ├── repositories/
│   │   └── prisma-processo.repository.ts    # ⭐ IMPLEMENTAÇÃO
│   └── listeners/
│       └── processo-events.listener.ts       # publica na fila/outbox
│
├── presentation/
│   ├── legal-cases.controller.ts
│   ├── dtos/
│   │   ├── criar-processo.dto.ts             # schema Zod (reafirma api/19-openapi §19.8)
│   │   └── processo-resposta.dto.ts
│   └── presenters/
│       └── processo.presenter.ts
│
└── legal-cases.module.ts
```

## 3.2 Domain

**Contém:** entidades, agregados, value objects, eventos de domínio, erros
de domínio, factories, **interfaces** de repositório.
**Regra absoluta:** zero import de `@nestjs/*`, `@prisma/client`, HTTP ou
qualquer biblioteca de infraestrutura — um teste de arquitetura
(`dependency-cruiser`) falha o build se isso ocorrer. Domínio é TypeScript
puro, testável sem框ework.
**Onde mora a regra de negócio real:** invariantes de agregado (ex.:
`Processo` sempre tem `responsavelPrincipalId`), transições de estado
válidas (`StatusProcesso.transicionarPara(novoStatus)`), validação de Value
Object (`NumeroCnj.criar(valor)` rejeita dígito verificador inválido).

## 3.3 Application

**Contém:** um use case por intenção do usuário (nunca um `*.service.ts`
genérico com 30 métodos, reafirma
[../05-arquitetura-backend.md §5.3](../05-arquitetura-backend.md)), policies
de autorização de recurso, mappers.
**Regra:** um use case orquestra domínio + repositórios (via interface) +
ports de infraestrutura (via interface) — nunca conhece Prisma, HTTP ou
provedor concreto de e-mail/IA/storage diretamente, apenas as interfaces
declaradas em `domain/repositories/*` e `shared/*/port.ts`.
**Transação:** um use case que escreve em mais de uma tabela abre a
transação aqui (via `UnitOfWork` injetado), nunca na camada de
apresentação nem na de infraestrutura isoladamente.

## 3.4 Infrastructure

**Contém:** implementação concreta dos repositórios (Prisma), listeners que
traduzem evento de domínio em efeito de infraestrutura (publicar na fila,
gravar outbox).
**Regra:** é a única camada que importa `@prisma/client` — reafirma
[../database/01-estrategia-multitenancy.md §1.5](../database/01-estrategia-multitenancy.md).
Repositórios estendem `BaseTenantRepository<T>` de `shared/infrastructure/database/`,
que já exige `escritorioId` como parâmetro obrigatório de todo método de
leitura (impossível compilar uma chamada sem tenant).

## 3.5 Presentation (Interface)

**Contém:** Controller (mapeamento de rota HTTP → use case), DTOs de entrada/
saída (schema Zod, reafirma
[../api/19-openapi.md §19.8](../api/19-openapi.md)), presenters (formatação
final da resposta).
**Regra:** Controller **nunca** contém regra de negócio nem acesso a banco —
apenas extrai contexto (`@CurrentUser`, `@Tenant`), valida forma (pipe Zod),
delega ao use case, mapeia o resultado (`Result<T>` de domínio) para o
código HTTP e DTO de resposta corretos, incluindo tratamento de erro via
`DomainExceptionFilter` (reafirma
[17-errors.md](../api/17-errors.md) — todo erro de domínio mapeia para um
`code`/`status` já catalogado na especificação de API).

## 3.6 `Result<T>` — como um use case comunica sucesso/falha

Reafirma `shared/domain/result.ts`: use cases retornam `Result<T>`
(sucesso com valor, ou falha com um `DomainError` tipado) em vez de lançar
exceção para fluxo de controle esperado (ex.: "CNJ duplicado" é um `Result`
de falha, não uma `throw`) — exceção é reservada a erro verdadeiramente
excepcional (falha de infraestrutura). O Controller traduz `Result` de falha
em resposta HTTP via `DomainExceptionFilter`, que mapeia cada `DomainError`
conhecido ao `code`/`status` de [17-errors.md](../api/17-errors.md).

---

**Anterior:** [02-modulos.md](02-modulos.md) · **Próximo:** [04-dependencias.md](04-dependencias.md)
