# 05 — Arquitetura Backend

**Stack:** NestJS 11 · TypeScript 5 (strict) · PostgreSQL 16 (+ `pgvector`, `pg_trgm`) ·
Prisma · Redis · BullMQ · S3-compatible storage · OpenTelemetry.

---

## 5.1 Estilo arquitetural

**Monólito modular** — não microsserviços.

Justificativa: o MVP tem um time pequeno, um domínio ainda instável e nenhum
requisito de escala independente por módulo. Microsserviços aqui pagariam custo
de operação, latência e complexidade distribuída para resolver um problema que
não existe. O que se faz **agora** é preparar as fronteiras: cada módulo é
autocontido, comunica-se por interfaces e eventos, e pode ser extraído depois sem
reescrita. Essa é a diferença entre "monólito" e "monólito modular".

Aplicamos **Clean Architecture pragmática** — quatro camadas por módulo, sem
cerimônia excessiva:

```
┌──────────────────────────────────────────────────────────┐
│  Interface        Controllers · DTOs · Guards · Presenters │
├──────────────────────────────────────────────────────────┤
│  Aplicação        Use Cases · Orquestração · Ports        │
├──────────────────────────────────────────────────────────┤
│  Domínio          Entidades · Value Objects · Regras      │  ← sem dependências
├──────────────────────────────────────────────────────────┤
│  Infraestrutura   Repositories · Prisma · S3 · IA · Fila  │
└──────────────────────────────────────────────────────────┘
```

**Regra da dependência:** aponta sempre para dentro. Domínio não conhece Prisma,
NestJS, HTTP nem provedor de IA. Inversão via interfaces (ports) declaradas na
camada de aplicação e implementadas na infraestrutura.

**Onde aplicamos DDD e onde não aplicamos** — decisão explícita para evitar
over-engineering:

| Módulo | Tratamento | Por quê |
|---|---|---|
| Processos | DDD tático completo (agregado, VO, eventos, invariantes) | Núcleo do negócio, regras ricas, alto valor |
| Documentos | DDD parcial (agregado + VO de versão) | Regras médias, ciclo de vida relevante |
| Autorização | DDD parcial (política como objeto de domínio) | Regras críticas de segurança |
| IA | Serviço de aplicação + ports | Orquestração, quase sem regra de negócio própria |
| Notificações | CRUD + motor de regras | Domínio anêmico por natureza |
| Busca | Serviço de infraestrutura | Sem regra de negócio |
| Perfil / Admin | CRUD direto | DDD aqui seria puro custo |

DDD é ferramenta, não religião. Aplicá-lo onde não há complexidade de domínio é
o erro mais comum e mais caro em projetos que "seguem Clean Architecture".

---

## 5.2 Mapa de módulos

```
apps/api/src/
├── modules/
│   ├── auth/              Autenticação, tokens, OAuth, MFA, sessões
│   ├── users/             Usuários, perfis, preferências
│   ├── tenants/           Escritórios, planos, membros, convites
│   ├── authorization/     Papéis, permissões, políticas (RBAC + ABAC leve)
│   ├── clients/           Clientes do escritório
│   ├── cases/             ⭐ Processos — agregado central
│   ├── documents/         Documentos, versões, storage, extração
│   ├── timeline/          Eventos unificados do processo
│   ├── comments/          Comentários e menções
│   ├── deadlines/         Prazos e tarefas
│   ├── search/            Indexação e busca híbrida
│   ├── ai/                Resumos, embeddings, orquestração de prompts
│   ├── notifications/     Motor de notificação e canais
│   ├── audit/             Trilha de auditoria (append-only)
│   └── files/             Storage, URLs pré-assinadas, antivírus
│
├── shared/
│   ├── domain/            Entity, AggregateRoot, ValueObject, DomainEvent, Result
│   ├── application/       UseCase, Ports, PaginatedResult, UnitOfWork
│   ├── infrastructure/
│   │   ├── database/      PrismaService, base repository, transações
│   │   ├── cache/         RedisService
│   │   ├── queue/         BullMQ, processors base
│   │   ├── storage/       S3Service
│   │   ├── mail/          MailService, templates
│   │   ├── ai/            Adapters de provedor (Anthropic/OpenAI)
│   │   └── telemetry/     Logger, tracing, métricas
│   └── presentation/
│       ├── decorators/    @CurrentUser, @Tenant, @RequirePermission, @Audit
│       ├── guards/        JwtAuthGuard, TenantGuard, PermissionGuard, ThrottleGuard
│       ├── interceptors/  Logging, Transform, Timeout, Audit
│       ├── filters/       AllExceptionsFilter, DomainExceptionFilter
│       └── pipes/         ZodValidationPipe
│
├── config/                Configuração validada com Zod
├── jobs/                  Workers (mesmo código, processo separado)
└── main.ts
```

### Anatomia de um módulo (exemplo: `cases`)

```
modules/cases/
├── domain/
│   ├── entities/
│   │   ├── case.entity.ts                 # AggregateRoot
│   │   └── case-party.entity.ts
│   ├── value-objects/
│   │   ├── cnj-number.vo.ts               # valida dígito verificador
│   │   ├── case-status.vo.ts
│   │   └── monetary-value.vo.ts
│   ├── events/
│   │   ├── case-created.event.ts
│   │   ├── case-assigned.event.ts
│   │   └── case-status-changed.event.ts
│   ├── errors/
│   │   └── duplicate-cnj.error.ts
│   └── repositories/
│       └── case.repository.ts             # ⭐ INTERFACE (port)
│
├── application/
│   ├── use-cases/
│   │   ├── create-case.use-case.ts
│   │   ├── update-case.use-case.ts
│   │   ├── list-cases.use-case.ts
│   │   ├── get-case-detail.use-case.ts
│   │   ├── assign-case.use-case.ts
│   │   └── archive-case.use-case.ts
│   ├── dtos/
│   └── mappers/
│       └── case.mapper.ts                 # domínio ↔ persistência ↔ resposta
│
├── infrastructure/
│   ├── repositories/
│   │   └── prisma-case.repository.ts      # ⭐ IMPLEMENTAÇÃO
│   └── listeners/
│       └── case-events.listener.ts
│
├── presentation/
│   ├── cases.controller.ts
│   ├── schemas/                           # Zod: entrada e saída
│   └── presenters/
│
└── cases.module.ts
```

---

## 5.3 Responsabilidade de cada camada

| Camada | Faz | Nunca faz |
|---|---|---|
| **Controller** | Rota, validação de forma, extração de contexto, delegação, código HTTP | Regra de negócio, acesso a banco |
| **Use Case** | Orquestra domínio + ports, transação, publica eventos, autorização de recurso | Conhecer HTTP, SQL ou provedor externo |
| **Entidade/Agregado** | Invariantes, transições de estado, eventos de domínio | Conhecer framework ou I/O |
| **Repository (interface)** | Contrato de persistência em linguagem de domínio | — |
| **Repository (impl.)** | Prisma, queries, mapeamento, filtro de tenant | Regra de negócio |
| **Service de infra** | S3, e-mail, IA, cache, fila | Decisão de negócio |

**Um use case = uma intenção do usuário.** Não existe `CaseService` com 900 linhas
e 30 métodos — esse é o padrão que transforma "arquitetura em camadas" em
"controller gordo com outro nome".

---

## 5.4 Multi-tenancy

**Modelo:** banco compartilhado, schema compartilhado, `tenantId` discriminador —
com **três camadas de defesa**:

1. **Contexto de requisição.** `TenantGuard` resolve o tenant do JWT (não do
   header — header é controlado pelo cliente) e o armazena em `AsyncLocalStorage`.
2. **Middleware de persistência.** Extensão do Prisma injeta `tenantId` em todo
   `where` e todo `create` automaticamente. Um desenvolvedor que esquecer o filtro
   não causa vazamento.
3. **Row-Level Security no PostgreSQL.** Políticas RLS por `tenant_id` como
   última barreira. Se as camadas 1 e 2 falharem, o banco recusa.

> Redundância aqui é intencional. Vazamento entre escritórios em dado sob sigilo
> profissional é um evento de extinção do produto, não um bug de severidade alta.

Cache Redis usa chaves prefixadas com `tenant:{id}:` — cache é vetor de vazamento
tão real quanto o banco.

---

## 5.5 Autenticação

### Estratégia de tokens

| Token | TTL | Armazenamento | Conteúdo |
|---|---|---|---|
| Access | 15 min | Memória (cliente) / cookie httpOnly (SSR) | `sub`, `tenantId`, `roles`, `permissions`, `sessionId`, `jti` |
| Refresh | 7 dias (30 com "lembrar de mim") | Cookie httpOnly, Secure, SameSite=Lax | `sub`, `sessionId`, `familyId` |

**Rotação com detecção de reuso:** cada refresh emite um novo par e invalida o
anterior. Se um refresh token já usado for reapresentado, toda a *família* de
tokens é revogada e um alerta de segurança é disparado — é a assinatura clássica
de token roubado.

**Revogação em tempo real:** `sessionId` verificado contra um denylist em Redis
com TTL igual ao do access token. Custo: uma leitura Redis por requisição.
Benefício: desligamento de funcionário revoga acesso em segundos, não em 15 minutos.

### OAuth 2.0 — Google e Microsoft

Authorization Code + PKCE, `state` assinado e de uso único, `nonce` validado.
Vinculação a usuário existente **somente** se o provedor confirmar e-mail
verificado. Provedores ficam em `UserIdentity` (N provedores por usuário), não em
colunas do usuário — isso é o que permite adicionar SSO empresarial e SAML depois
sem migração.

### MFA
TOTP (RFC 6238), 10 códigos de recuperação de uso único (armazenados com hash),
obrigatório para papéis `ADMIN` e `SOCIO` a partir da Fase 2.

### Senhas
Argon2id (`memoryCost` 19 MiB, `timeCost` 2, `parallelism` 1). Mínimo 12
caracteres, verificação contra lista de senhas vazadas (k-anonymity via HIBP).
Nada de regra de "1 maiúscula + 1 símbolo" — comprimento e não-reuso importam mais.

---

## 5.6 Autorização

**RBAC como base + ABAC para escopo de recurso.**

### Papéis padrão

| Papel | Escopo |
|---|---|
| `OWNER` | Tudo, incluindo faturamento e exclusão do escritório |
| `ADMIN` | Gestão de usuários, permissões, auditoria, integrações |
| `SOCIO` | Todos os processos do escritório, métricas, gestão de equipe |
| `ADVOGADO` | Processos onde é responsável ou membro da equipe |
| `ESTAGIARIO` | Somente processos atribuídos; sem exclusão |
| `ASSISTENTE` | Cadastro e upload; leitura ampla; sem dado financeiro sensível |
| `CLIENTE` | *(Fase 3)* Apenas os próprios processos, conteúdo compartilhado |

### Permissões
Formato `recurso:acao:escopo` — ex.: `case:read:all`, `case:read:assigned`,
`case:delete:own`, `document:download:all`, `audit:read:all`.

Papel é um agrupamento de permissões, e permissões podem ser concedidas ou
revogadas individualmente por usuário (overrides). Escritórios são organizações
com exceções — modelo rígido é rejeitado na prática.

### Duas etapas de verificação
1. **`PermissionGuard`** (declarativo, via `@RequirePermission('case:read')`) —
   o usuário pode executar esta *ação*?
2. **Autorização de recurso no use case** — o usuário pode agir sobre *este
   registro específico*? (é responsável, é da equipe, o processo é do seu tenant)

A etapa 2 nunca pode ser pulada. Guard sozinho protege endpoint, não linha.

---

## 5.7 Auditoria

Tabela append-only, sem `UPDATE` e sem `DELETE` (garantido por permissão do
usuário de banco da aplicação). Registro: `id`, `tenantId`, `actorId`, `action`,
`resourceType`, `resourceId`, `before`, `after` (com campos sensíveis redigidos),
`ip`, `userAgent`, `correlationId`, `createdAt`.

**Eventos obrigatoriamente auditados:** login/logout/falha de login · criação,
alteração e exclusão de processo · **visualização e download de documento** ·
alteração de permissão · convite e desativação de usuário · exportação de dados ·
toda chamada de IA · acesso administrativo.

Captura por `AuditInterceptor` com o decorator `@Audit(...)` — auditoria não pode
depender de o desenvolvedor lembrar de chamá-la manualmente. Retenção: 12 meses
quente, 5 anos frio (arquivamento).

---

## 5.8 Processamento assíncrono (BullMQ)

| Fila | Jobs | Concorrência |
|---|---|---|
| `documents` | extração de texto, OCR, thumbnail, antivírus | 5 |
| `search` | indexação, geração de embeddings, reindexação | 10 |
| `ai` | resumos, extração de pontos-chave | 3 (limitado por custo/rate) |
| `notifications` | envio in-app, e-mail, digest | 20 |
| `maintenance` | limpeza de lixeira, expurgo de sessão, arquivamento de auditoria | 1 |

Retry com backoff exponencial (3 tentativas), **DLQ** para falhas terminais,
idempotência por chave de job, e todo job carrega `tenantId` + `correlationId`.

Workers rodam como processo separado com a mesma base de código — escala
independente sem separar repositório.

---

## 5.9 Busca híbrida

```
Consulta
   ├─→ Léxica (PostgreSQL full-text + pg_trgm)  → nomes, números, metadados, typo-tolerância
   └─→ Semântica (pgvector, HNSW)               → conteúdo dos documentos
              ↓
   Reciprocal Rank Fusion
              ↓
   Filtro de permissão (obrigatório, no banco)
              ↓
   Resultados agrupados
```

**Decisão:** PostgreSQL para busca no MVP, não Elasticsearch/OpenSearch. Motivo:
um banco a menos para operar, transacionalidade com o dado principal e volume
esperado (dezenas de milhares de documentos por tenant) plenamente atendido.
Ponto de reavaliação: >5M documentos por tenant ou p95 acima de 400 ms.

O filtro de permissão acontece **na query**, não pós-consulta. Retornar N
resultados e filtrar depois quebra paginação e vaza contagem.

---

## 5.10 Camada de IA

```
Use Case de IA
   ↓
AIOrchestrator          → seleção de estratégia, montagem de contexto, cota
   ↓
ContextBuilder          → RAG: recupera trechos relevantes por embedding
   ↓
PromptRegistry          → prompts versionados, com template e variáveis
   ↓
AIProvider (port)       → interface agnóstica de fornecedor
   ↓
AnthropicAdapter | OpenAIAdapter    (implementações)
   ↓
Streaming (SSE) → cliente        +      persistência do resultado + custo
```

**Decisões:**
- **Port + adapter** desde o dia 1. Trocar de provedor é decisão de negócio
  (preço, latência, contrato de privacidade) que vai acontecer.
- **Prompts versionados em código**, com registro do `promptVersion` em cada saída
  — sem isso é impossível diagnosticar regressão de qualidade.
- **RAG obrigatório** em documentos longos: enviar o processo inteiro é caro,
  lento e degrada a qualidade.
- **Rastreabilidade:** toda saída guarda `sourceRefs` (documento + trecho + página).
- **Custo:** tokens de entrada/saída, custo estimado e latência gravados por
  chamada, com cota por tenant.
- **Timeout e circuit breaker** — indisponibilidade do provedor não pode derrubar
  funcionalidade não-IA.

---

## 5.11 API — contrato

REST, versionado em `/api/v1`, OpenAPI 3.1 gerado automaticamente (fonte dos
tipos do frontend).

- Paginação por **cursor** (`?cursor=&limit=`), nunca offset em coleção grande.
- Filtro e ordenação padronizados em todos os endpoints de lista.
- Erros em **RFC 9457 (Problem Details)** com `code` estável, `correlationId` e
  `fieldErrors` por campo.
- Idempotência em `POST` sensível via header `Idempotency-Key`.
- Rate limit por tenant + por usuário + por IP, com headers padrão.
- `ETag` / `If-None-Match` em recursos de leitura pesada.
- SSE para streaming de IA e para notificações em tempo real (WebSocket só se a
  bidirecionalidade se provar necessária — SSE resolve o caso e é mais simples).

---

## 5.12 Observabilidade

Logs estruturados em JSON (Pino) com `correlationId`, `tenantId`, `userId` — e
**redação obrigatória** de PII e conteúdo de documento. Tracing distribuído com
OpenTelemetry cobrindo HTTP → use case → banco → fila → provedor de IA.

Métricas de negócio (não só técnicas): latência de busca, custo de IA por tenant,
taxa de sucesso de processamento de documento, taxa de feedback positivo em IA.

Health checks: `/health/live` e `/health/ready` (banco, Redis, storage).

---

## 5.13 Resiliência

Circuit breaker em toda dependência externa (IA, e-mail, storage, OAuth) ·
timeouts explícitos em toda chamada de rede (nunca infinito) · retry com backoff
e jitter apenas em operação idempotente · graceful shutdown drenando fila e
requisições em voo · degradação funcional: se a IA cair, o resto do produto
continua; se a busca semântica cair, cai-se para a léxica.

---

**Anterior:** [04-arquitetura-frontend.md](04-arquitetura-frontend.md) · **Próximo:** [06-modelo-dominio.md](06-modelo-dominio.md)
