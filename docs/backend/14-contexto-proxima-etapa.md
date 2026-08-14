# 14 — Contexto Oficial para o Prompt 5B

## CONTEXTO OFICIAL PARA O PROMPT 5B

**Escopo desta etapa.** Arquitetura completa de implementação do backend
NestJS em `docs/backend/` (15 arquivos), sem código, sem Controllers/
Services/Prisma/migrations. Projeta como o código é organizado para
implementar tudo que já era oficial em `docs/00-10`, `docs/database/`,
`docs/ux/` e `docs/api/`. Também fecha as duas pendências da especificação
de API que eram, na verdade, decisões de arquitetura de backend: provedor de
e-mail e contract testing (as outras duas — autenticação SSE e geração de
OpenAPI — já haviam sido fechadas diretamente em `docs/api/`).

**Estrutura de pastas.** Monólito modular: `modules/<19 módulos>`,
`shared/` (infraestrutura transversal: banco/extensões Prisma, cache, fila,
storage, mail, IA, telemetria), `common/` (apresentação transversal: guards,
strategies, interceptors, filters, decorators, pipes, middlewares,
validators), `config/` (validado por Zod no boot), `jobs/` (entry point dos
workers, mesmo código-fonte da API), `health/`.

**Camadas (por módulo).** `domain/` (entidades, VOs, eventos, erros,
factories, interfaces de repositório — zero import de framework/Prisma) →
`application/` (use cases um-por-intenção, policies de autorização de
recurso, mappers) → `infrastructure/` (implementação Prisma dos
repositórios, listeners de evento) → `presentation/` (Controller, DTOs Zod,
presenters). Regra de import sempre de fora para dentro, verificada por
`dependency-cruiser` no CI. Uso de `Result<T>` para fluxo de controle
esperado, exceção reservada a falha de infraestrutura real.

**Módulos e dependências.** 19 módulos NestJS (granularidade ligeiramente
mais fina que os módulos de domínio — `Deadlines` e `Folders` como módulos
próprios, subordinados a `LegalCases`/`Documents`, decisão registrada e
justificada em `13-decisoes.md §13.1`, sem conflito real). Grafo de
dependência com `Identity`/`Office` na base, `Timeline`/`Notifications`/
`Audit`/`Search` como bordas de saída (nada depende deles), comunicação
preferencial por evento de domínio em vez de chamada direta entre módulos de
conteúdo — a mesma propriedade que sustenta a extração futura de Documents/
IA/Search como serviço separado, já anunciada na arquitetura oficial.

**Autenticação (implementação).** Passport com 5 strategies (`Local`, `Jwt`,
`JwtRefresh`, `Google`, `Microsoft`), `TokenService` com RS256 e rotação de
chave por `kid`, `SessionService` + denylist Redis para revogação em tempo
real. SSE autenticado por cookie `httpOnly` reaproveitando o `JwtAuthGuard`
padrão — sem guard/strategy especial (decisão já fechada em
`docs/api/02-autenticacao.md §2.9`, aqui apenas com o ponto de implementação).

**Autorização (implementação).** `PermissionGuard` (ação, via decorator
`@RequirePermission`) + `*.policy.ts` por módulo (recurso — segredo de
justiça, confidencialidade, escopo ALL/TEAM/ASSIGNED/OWN), sempre as duas
etapas. Falha de policy mapeada a 404 pelo `DomainExceptionFilter`, nunca
403. Prevenção de auto-escalonamento de papel implementada no use case, não
no guard. Segredos (JWT, OAuth, criptografia, provedores externos) em Secret
Manager, nunca em `.env` de produção.

**Storage.** Port/adapter (`StoragePort` + `S3Adapter`/`LocalAdapter`),
nenhum use case conhece o provedor concreto. URLs assinadas de curto TTL,
versionamento via `storageKey` própria por versão, antivírus como adapter
próprio.

**E-mail (pendência resolvida).** Port/adapter (`MailPort` +
`SmtpAdapter`/`SesAdapter`/`SendgridAdapter`), configurável por
`MAIL_PROVIDER` no ambiente, envio sempre via fila `notifications` (nunca
síncrono no request), nenhuma regra de negócio acoplada ao fornecedor.

**Filas.** BullMQ com 5 filas (`documents`, `search`, `ai`, `notifications`,
`maintenance`) + outbox (`OutboxPublisherWorker`) para entrega confiável de
evento de domínio. `jobId` determinístico para idempotência, retry com
backoff, DLQ por fila, graceful shutdown drenando job ativo.

**Cache.** Redis com chave sempre prefixada por tenant, invalidação
preferencialmente orientada a evento (TTL como rede de segurança, não
mecanismo primário); busca global nunca cacheada.

**Observabilidade.** Pino (logs redigidos de PII), OpenTelemetry preparado,
métricas de latência/erro/fila/custo de IA, health checks, `correlationId`
propagado de ponta a ponta (frontend → request → banco → fila → worker).

**Testes.** Unitário (domínio + use case com mock de interface), integração
(Prisma real via Testcontainers, inclui suíte de isolamento de tenant), E2E
(8 fluxos críticos), e **contract testing (pendência resolvida)**: Dredd ou
schemathesis validando request/response/status contra o OpenAPI gerado, com
`oasdiff` detectando breaking change antes do contract test rodar — os dois
como gates de CI.

**Docker.** Compose de desenvolvimento com `api`, `worker` (mesma imagem),
`postgres`, `redis`, `minio` (S3 local), `mailhog` (e-mail local), `web`.
Produção usa serviços gerenciados, mesma imagem de container em todos os
ambientes.

**Conflito identificado.** Granularidade de módulo (`Deadlines`/`Folders`
como módulos NestJS próprios vs. parte de `LegalCases`/`Documents` no
domínio) — resolvido sem impacto em dados, API ou regra de negócio, apenas
organização de código.

**Pendências explícitas para a implementação (Prompt 5B):**
1. Escolha final entre Dredd e schemathesis para contract testing.
2. Provedor de Secret Manager específico conforme a nuvem escolhida.
3. Escrita do `schema.prisma` real e das migrations executáveis — não
   produzido em nenhuma etapa até aqui.
4. Implementação de fato de Controllers, Use Cases, Repositórios e
   Processors — este documento projeta a estrutura, o Prompt 5B escreve o
   conteúdo.
5. Confirmar dimensionamento de infraestrutura (tamanho de instância,
   número de workers) — depende de teste de carga ainda não realizado.

**O que a implementação deve tratar como imutável vindo desta etapa:** toda
estrutura de pasta, módulo, camada, regra de dependência, estratégia de
autenticação/autorização/storage/fila/cache/observabilidade/teste/Docker
documentada em `docs/backend/00` a `docs/backend/13` — o código é escrito
para se encaixar nesta organização, não para redesenhá-la durante a
implementação.

---

**Anterior:** [13-decisoes.md](13-decisoes.md) · **Início:** [00-resumo.md](00-resumo.md)
