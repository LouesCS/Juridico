# 00 — Status da Implementação

> **Código real em `apps/api/`** — projeto NestJS instalado (`npm install`
> executado), Prisma Client gerado, build (`npm run build`) e testes
> (`npx jest`) rodados de verdade neste ambiente. Este documento reflete o
> estado **real e verificado**, não um plano.
>
> **Ambiente desta etapa não tem Docker, PostgreSQL nem Redis instalados** —
> só foi possível verificar o que roda sem infraestrutura externa: build,
> typecheck, lint e testes unitários com mocks. Migrations, testes de
> integração/E2E e o Docker Compose **não foram executados de fato**, apenas
> escritos — ver [17-tests.md](17-tests.md) e [18-docker-ci.md](18-docker-ci.md).
>
> **PROMPT 5C (continuação) — Etapas 1, 2 e 3 concluídas nos limites deste
> ambiente:** Etapa 1 (Auditoria) implementada **e executada** (38/38
> testes). Etapas 2 (RLS) e 3 (migrations reais + extensões de busca)
> **escritas e verificadas estruturalmente, nunca aplicadas contra Postgres
> real** (sem Docker/Postgres neste ambiente) — inclui um teste de
> integração real via Testcontainers, também nunca executado. Ver
> [15-audit.md](15-audit.md), [03-multitenancy.md](03-multitenancy.md),
> [02-database.md](02-database.md), [17-tests.md](17-tests.md) e
> [19-decisions.md §19.8–19.11](19-decisions.md).
>
> **PROMPT 7 (esta rodada) — Clients e Legal Cases implementados e
> testados.** Nenhuma mudança em `schema.prisma` (os dois modelos já
> existiam completos desde a Fase 1) — só código de aplicação. 74 testes
> novos (42 dos módulos + 32 de validadores/case-scope), todos passando
> junto dos 58 já existentes (100/100 no total). Mesma limitação de
> ambiente das rodadas anteriores: sem Postgres, nada foi executado contra
> banco real — só `prisma validate`, build, lint e testes unitários com
> mocks.
>
> **Sprint 08 — Deadlines e Timeline implementados e
> testados.** `TipoEventoTimeline` ganhou 12 valores novos (migration
> aditiva, `ALTER TYPE ... ADD VALUE`, nunca aplicada contra Postgres real
> — mesma limitação de sempre); nenhum outro modelo mudou. 45 testes novos
> (100/100 → 145/145 no total). Eventos automáticos gravados via
> `TimelineRecorderService` (único caminho de escrita em `EventoTimeline`)
> a partir de use cases já existentes de Clients/LegalCases — nenhuma tela
> grava diretamente na Timeline.
>
> **Sprint 09 — Documents e Folders implementados e
> testados.** Módulo novo (`apps/api/src/modules/documents/`): upload real
> (presign → PUT direto ao storage → confirm, binário nunca trafega pela
> API), versionamento imutável, pastas com prevenção de ciclo/profundidade
> máxima, favoritos, lixeira, busca/filtros agregados. `StoragePort` +
> `LocalStorageAdapter` **real** (filesystem + URLs assinadas HMAC,
> servidas por um controller local próprio) — `S3StorageAdapter` é um
> stub documentado (sem bucket real neste ambiente). 67 testes novos
> (145/145 → 212/212 no total). Dois bugs reais corrigidos: `hashSha256`
> era `NOT NULL` mas o fluxo de presign cria o `Documento` antes do hash
> existir (coluna virou nullable); `INCLUDE_DELETED` (soft-delete escape
> hatch) nunca funcionava de fato desde o Prompt 7 — corrigido nesta
> rodada porque a Lixeira de Documentos/Pastas dependia dele funcionando.
>
> **Sprint 10 — Universal Search implementada e testada.**
> Módulo novo (`apps/api/src/modules/search/`): `GET /search` agregado (9
> grupos: Clientes, Processos, Documentos, Prazos, Equipe, Pastas,
> Timeline, Tags, Comentários) e `GET /search/suggestions` (ações rápidas
> filtradas por permissão). Nenhuma mudança em `schema.prisma` — as colunas
> `buscaTsv`/índices GIN já existiam desde o Prompt 5C, nunca consumidas
> até agora. Um adapter por tipo de entidade (`SearchAdapter`), todos
> reaproveitando os mesmos helpers de escopo/confidencialidade já testados
> de `case-scope.ts`/`document-scope.ts` — nenhuma regra de autorização
> duplicada. Desvio consciente registrado: como `buscaTsv` é
> `Unsupported("tsvector")` no Prisma Client (não filtrável pela query
> builder tipada) e as extensões `pg_trgm`/`unaccent` nunca foram aplicadas
> contra Postgres real, a busca usa `contains`/`mode:"insensitive"` (ILIKE)
> com ranking/snippet calculados em memória, em vez de FTS/trigram via SQL
> bruto — evita duplicar a lógica de segredo de justiça/confidencialidade
> em `$queryRaw` sem poder testá-la contra banco real. 35 testes novos
> (212/212 → 247/247 no total).
>
> **Sprint 15 (Prompt 14) — Task Engine implementado e testado.** Módulo
> novo (`apps/api/src/modules/tasks/`): CRUD completo + ciclo de vida
> (archive/restore/duplicate/move/reopen/complete/cancel), checklist,
> dependências com "teto de bloqueio" de conclusão, recorrência síncrona
> (sem fila), vínculos multi-entidade (9 tipos), favoritos, comentários
> mínimos, dashboard agregado. Status/Prioridade nunca são enum fixo —
> Conjuntos de Valores auto-provisionados (Configuration Engine, Prompt
> 13). Timeline/IA generalizados pela 3ª/4ª vez para Tarefa; Busca Global
> ganha um 10º adapter. Ver [23-task-engine.md](23-task-engine.md). 81
> testes novos (402/402 → 483/483 no total).
>
> **Sprint 11 (esta rodada) — Assistente Jurídico Inteligente (AI
> Orchestration Layer) implementado e testado.** Dois módulos novos:
> `shared/infrastructure/ai/` (camada de provedor — `AiProvider` +
> `MockAiProvider` **real** e determinístico, `OpenAiProvider`/
> `AnthropicProvider`/`GeminiProvider`/`OllamaProvider` — chamadas HTTP
> corretas via `fetch`, nunca exercitadas de fato nesta rodada por falta de
> credencial/rede de saída neste ambiente — + `AiProviderRegistry`,
> `withRetry` com timeout/backoff) e `modules/ai/` (`ResumoIA`/`FonteIA`
> generalizados para Processo/Documento/Cliente, prompts versionados,
> `AiSummaryService` com cache por `hashContexto`, cota mensal por plano,
> SSE real via `AiStreamBus`, Chat stateless reaproveitando
> `UniversalSearchUseCase` da Sprint 10 para o escopo global). Schema
> estendido de forma aditiva: `resumos_ia.processo_id` passou a nullable +
> `documento_id`/`cliente_id`/`escopo_tipo` novos (migration nunca aplicada
> contra Postgres real, mesma limitação de todas as rodadas). 67 testes
> novos (247/247 → 314/314 no total).

## 0.1 Resumo por módulo

| Módulo | Status | Cobertura |
|---|---|---|
| Bootstrap (main.ts, config, filtros/pipes globais) | ✅ Implementado e verificado | Build + boot manual não testado (sem Postgres) |
| Banco de dados (schema.prisma completo) | ✅ Implementado e validado (`prisma validate`/`generate`) | 25 modelos, todas as entidades da Fase 1 |
| Multi-tenancy (contexto, extensões, guards) | ✅ Implementado e testado (unitário) | RLS **escrita** (migration + teste Testcontainers), **não aplicada** contra Postgres real — ver [03-multitenancy.md](03-multitenancy.md) |
| Identity | ✅ Implementado e testado | MFA e OAuth (Google/Microsoft) **pendentes** |
| Offices | ✅ Implementado | Sem testes unitários dedicados nesta rodada |
| Memberships | ✅ Implementado e testado (regra crítica) | — |
| Users | ❌ Não implementado | Endpoints de perfil/preferências (distintos de Identity) ficam para a próxima rodada |
| Clients | ✅ Implementado e testado (Prompt 7, ampliado no Sprint 17 — ver [§0.3.10](#0310-sprint-17--clientes-e-contatos)) | CRUD completo + archive/restore/duplicate + favoritos + `/clients/export` + `/clients/:id/timeline` + `/clients/:id/legal-cases`; categoria Cliente/Contato/Ambos, campos pessoais PF, Campos Extras (1º consumidor real do Configuration Engine); aviso não bloqueante de documento duplicado; 26 testes |
| Legal Cases | ✅ Implementado e testado (Prompt 7) | CRUD + archive/restore + segredo de justiça + versionamento otimista (`If-Match`) + escopo `assigned/team/all` + Equipe/Participantes/Prazos + `GET /v1/deadlines` agregado; Tags e Processos Relacionados (§9.5/§9.6) **deferidos**; 32 testes |
| Deadlines / Timeline | ✅ Implementado e testado (Sprint 08) | `Prazo`: CRUD completo por processo + complete/reopen/duplicate + `GET /deadlines` agregado (filtros ricos, paginação). `EventoTimeline`: `TimelineRecorderService` (único caminho de escrita) + `GET /legal-cases/:id/timeline` (mescla eventos reais com projeção de `Prazo`) + CRUD de anotação manual + `GET /timeline` agregado. Eventos automáticos: criação/atualização/status/prioridade/responsável/equipe/segredo de justiça/arquivamento/restauração/cliente atualizado. Tela dedicada `/prazos` e Timeline em `/processos/:id` — 45 testes |
| Documents / Folders | ✅ Implementado e testado (Sprint 09) | `Documento`: presign/confirm (upload real), metadados, mover, duplicar (reaproveita `storageKey` imutável), favoritar, versionar (token HMAC entre presign/confirm de versão, nunca expõe `storageKey` ao cliente), download/preview (bloqueio incondicional se `INFECTADO`), lixeira. `Pasta`: árvore com `pastaPaiId`, prevenção de ciclo, profundidade máxima 6, exclusão em cascata opcional. `Tag`: listar/criar sob demanda. Eventos automáticos via `TimelineRecorderService`. 67 testes |
| Comments / Tags | ⚠️ Parcial (Tags mínimo na Sprint 09) | `Tag`/`DocumentoTag` usados por Documents (listar/criar); Comments e Tags de Processo continuam não implementados |
| Notifications | ❌ Não implementado | Schema (`Notificacao`, `PreferenciaNotificacao`) existe; endpoints não |
| Search | ✅ Implementado e testado (Sprint 10) | `GET /search` agregado (9 grupos, ranking/snippet em memória sobre `contains`/`ILIKE`, escopo/confidencialidade reaproveitados de Legal Cases/Documents), `GET /search/suggestions`. `GET /search/recent` e `DELETE /search/history` não implementados — a própria doc de API já resolve os dois como client-side puro (`localStorage`) no MVP. 35 testes |
| AI | ✅ Implementado e testado (Sprint 11) | AI Orchestration Layer completa: 5 providers (`MockAiProvider` real, `OpenAI`/`Anthropic`/`Gemini`/`Ollama` escritos mas nunca exercitados sem credencial/rede), 10 prompts versionados, `AiSummaryService` (cache, cota, SSE), Chat stateless, `ResumoIA`/`FonteIA` generalizados para Processo/Documento/Cliente **e Tarefa (Sprint 15)**. 67 testes |
| Permission Engine | ✅ Implementado e testado (Sprint 13) | Ver [21-permission-engine.md](21-permission-engine.md) |
| Configuration Engine | ✅ Implementado e testado (Sprint 14) | Ver [22-configuration-engine.md](22-configuration-engine.md) |
| Task Engine | ✅ Implementado e testado (Sprint 15) | CRUD + ciclo de vida completo, checklist, dependências (bloqueio de conclusão), recorrência síncrona, vínculos multi-entidade, favoritos, comentários mínimos, dashboard agregado. Status/Prioridade via Conjuntos de Valores auto-provisionados. Ver [23-task-engine.md](23-task-engine.md). 81 testes |
| Audit | ✅ Implementado e testado (gravação) | Interceptor + decorator aplicados a Identity/Offices/Memberships; imutabilidade a nível de banco e endpoints de consulta ainda pendentes — ver [15-audit.md](15-audit.md) |
| Health | ✅ Implementado | `/health/live`, `/health/ready` |
| Filas (BullMQ) | ❌ Não implementado | Nenhum processor/worker escrito |
| Cache (Redis) | ⚠️ Parcial | `RedisService` + denylist de sessão implementados; sem outras estratégias de cache |
| Storage (S3) | ⚠️ Parcial (Sprint 09) | Abstração `StoragePort` + `LocalStorageAdapter` **real** (filesystem + URLs assinadas HMAC via controller próprio); `S3StorageAdapter` é um stub que lança `STORAGE_UNAVAILABLE` (sem bucket real neste ambiente). Antivírus: `FakeCleanAntivirusAdapter` síncrono (sempre `LIMPO`) — ClamAV real e pipeline assíncrono (extração/thumbnail/indexação) pendentes de BullMQ |
| E-mail | ⚠️ Parcial | `MailPort` + `LogMailAdapter` (dev/teste); Smtp/Ses/Sendgrid reais pendentes |
| Docker | ⚠️ Escrito, não executado | Sem Docker neste ambiente para validar |
| CI | ❌ Não implementado | Pipeline (lint/test/build/oasdiff/contract test) não criado nesta rodada |
| OpenAPI gerado | ⚠️ Parcial | Swagger configurado em `main.ts`; documento não inspecionado nesta rodada (exigiria subir o processo) |

## 0.2 Por que o escopo parou aqui

Esta etapa priorizou entregar uma **base genuinamente executável e testada**
(build real, 26 testes reais passando) para os módulos fundacionais
(Identity, Offices, Memberships) em vez de gerar código não verificado para
os 17 módulos pedidos — o próprio Prompt 5B exige "não declarar
funcionalidade pronta sem execução mínima" (§48) e "conclua cada bloco antes
de avançar" (§45). Fazer isso genuinamente para 17 módulos em uma única
etapa não é compatível com a mesma exigência de verificação — ver
[19-decisions.md](19-decisions.md) para o registro completo desta decisão de
escopo.

## 0.3 Métricas reais desta rodada

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 67 (62 + 5 do módulo Audit) |
| Arquivos de teste unitário | 9 (38 casos de teste) |
| Arquivos de teste de integração (escritos, não executados) | 1 (`tenant-isolation.spec.ts`, 6 casos) |
| Migrations escritas (não aplicadas) | 3 (`init`, `enable_rls`, `search_extensions`) |
| `npx jest` (unitário) | 9/9 suítes, 38/38 testes — **passou** |
| `npx tsc --noEmit` | 0 erros |
| `npm run build` (nest build) | Sucesso, `dist/` gerado |
| `npx eslint` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido |
| `npx prisma generate` | Sucesso |
| Migrations aplicadas contra Postgres real | 0 (sem Postgres neste ambiente) |
| `npm run test:integration` (Testcontainers) | Não executado (sem Docker neste ambiente) |
| Testes E2E executados | 0 (sem Postgres/Redis neste ambiente) |

## 0.3.1 Métricas reais — Prompt 7 (Clients + Legal Cases)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 24 (2 módulos + validadores CPF/CNPJ/CNJ compartilhados) |
| Arquivos de teste novos | 11 (74 casos de teste novos) |
| `npx jest` (unitário, suíte completa) | 20/20 suítes, **100/100 testes** — passou (58 já existentes + 42 novos de Clients/LegalCases) |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido (schema inalterado) |
| `npx prisma generate` | Sucesso |
| `npm run build` (nest build) | Sucesso |
| Mudanças em `schema.prisma` | 0 — `Cliente`/`Processo`/`ParteProcesso`/`ProcessoMembro`/`Prazo` já existiam completos |
| Novo código de erro adicionado ao catálogo | `JUSTIFICATION_REQUIRED` (422 — cancelar prazo `FATAL` sem motivo) |

## 0.3.2 Métricas reais — Sprint 08 (Deadlines + Timeline)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 8 (módulo `timeline/` completo: recorder, 3 grupos de use cases, 2 controllers, schemas, módulo) |
| Arquivos TypeScript de produção modificados | 9 (Legal Cases: `create/update/archive/restore-legal-case`, `case-team.use-cases`, `get/list-legal-case`, `update-client.use-case`, `clients.module.ts`/`legal-cases.module.ts`/`app.module.ts` para importar `TimelineModule`) |
| Arquivos de teste novos | 8 (45 casos de teste novos) |
| `npx jest` (suíte completa) | 28/28 suítes, **145/145 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido |
| `npx prisma generate` | Sucesso (gera os 12 valores novos do enum) |
| `npm run build` (nest build) | Sucesso |
| Migration nova | `20260801000000_timeline_event_types` (aditiva, `ALTER TYPE ADD VALUE`) |
| Novos códigos de erro no catálogo | `SYSTEM_EVENT_NOT_DELETABLE` (403), `TYPE_NOT_MANUAL` (422) |
| Bug real corrigido | `Processo.proximaDataRelevante` nunca era escrita por nenhum use case — `GetLegalCaseUseCase`/`ListLegalCasesUseCase` agora calculam a partir do `Prazo` pendente mais próximo em vez de ler a coluna sempre nula |

## 0.3.3 Métricas reais — Sprint 09 (Documents + Folders)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 24 (módulo `documents/` completo: storage port + local/S3 adapters + antivírus fake, folder use-cases, document upload/lifecycle/download/list/dashboard use-cases, document-scope, document-version-token, 2 controllers + schemas + módulo) |
| Arquivos TypeScript de produção modificados | 5 (`soft-delete.extension.ts` — bugfix, `error-catalog.ts`, `app.module.ts`, `seed.ts`, `env.schema.ts`) |
| Arquivos de teste novos | 11 (67 casos de teste novos) |
| `npx jest` (suíte completa) | 38/38 suítes, **212/212 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido |
| `npx prisma generate` | Sucesso |
| `npm run build` (nest build) | Sucesso |
| Migrations novas | `20260802000000_document_folder_favorites` (aditiva, 2 tabelas: `documento_favorito`, `pasta_favorito`), `20260802000001_document_hash_nullable` (`ALTER COLUMN hash_sha256 DROP NOT NULL`) |
| Mudanças em `schema.prisma` | +2 modelos (`DocumentoFavorito`, `PastaFavorito`), `Documento.hashSha256` passou a nullable |
| Novos códigos de erro no catálogo | `FOLDER_NOT_EMPTY` (409), `CIRCULAR_REFERENCE` (422), `MAX_DEPTH_EXCEEDED` (422), `UPLOAD_NOT_PENDING` (409), `UPLOAD_EXPIRED` (410), `HASH_MISMATCH` (422, reservado) |
| Nova permissão no catálogo (`seed.ts`) | `document:update` — o catálogo original (docs/api/03-autorizacao.md §3.8) não previa permissão distinta para editar/mover/duplicar/favoritar um documento já existente |
| Bugs reais corrigidos | (1) `documentos.hash_sha256` era `NOT NULL`, mas o presign cria a linha antes do hash existir — coluna virou nullable; (2) `INCLUDE_DELETED` nunca escapava o filtro de soft-delete de fato (achado desde o Prompt 7) — corrigido trocando `=== undefined` por `'excluidoEm' in where` |

## 0.3.4 Métricas reais — Sprint 10 (Search)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 9 (`search-types.ts`, `search-ranking.ts`, `search-adapters.ts` — 9 classes num único arquivo, mesmo padrão de agrupamento de `document-lifecycle.use-cases.ts` —, `universal-search.use-case.ts`, `search-suggestions.use-case.ts`, `search.schemas.ts`, `search.controller.ts`, `search.module.ts`) |
| Arquivos TypeScript de produção modificados | 1 (`app.module.ts` — import de `SearchModule`) |
| Arquivos de teste novos | 4 (35 casos de teste novos) |
| `npx jest` (suíte completa) | 42/42 suítes, **247/247 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido (schema inalterado) |
| `npm run build` (nest build) | Sucesso |
| Mudanças em `schema.prisma` | 0 — `buscaTsv`/`numeroCnjSomenteDigitos` já existiam desde o Prompt 5C |
| Novos códigos de erro no catálogo | 0 — validação de `q`/`limit` cai no fluxo padrão de `ZodValidationPipe` (422) |
| Nova permissão no catálogo | 0 — gate de rota usa `office:read` (concedida a todo papel do sistema); filtro real é por tipo de resultado, dentro de cada adapter |

## 0.3.5 Métricas reais — Sprint 11 (Assistente Jurídico Inteligente)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 33 (`shared/infrastructure/ai/` — porta, registro, retry, estimativa de tokens, 5 adapters, módulo — 9 arquivos; `modules/ai/` — tipos, prompts (template/builder/sanitizer), custo, hash, cota, stream bus, 3 context builders, resumo-access, `AiSummaryService`, 8 use-cases, schemas, 6 controllers, módulo — 24 arquivos) |
| Arquivos TypeScript de produção modificados | 4 (`app.module.ts`, `env.schema.ts`, `.env.example`, `error-catalog.ts` — `GENERATION_TIMEOUT`; `search.module.ts` passou a exportar `UniversalSearchUseCase`) |
| Arquivos de teste novos | 13 (67 casos de teste novos) |
| `npx jest` (suíte completa) | 55/55 suítes, **314/314 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx prisma validate` | Válido |
| `npx prisma generate` | Sucesso |
| `npm run build` (nest build) | Sucesso |
| Migration nova | `20260803000000_ai_resumo_escopo` (aditiva — `resumos_ia.processo_id` nullable, `+documento_id`/`cliente_id`/`escopo_tipo`; `+processo_id`/`cliente_id` em `fontes_ia`; `TipoResumoIA`/`TipoFonteIA` ganham valores novos) |
| Mudanças em `schema.prisma` | `ResumoIA`/`FonteIA` generalizados (Processo/Documento/Cliente) + novo enum `EscopoResumoIA` + back-relations em `Cliente`/`Processo`/`Documento` |
| Novos códigos de erro no catálogo | `GENERATION_TIMEOUT` (504) — os demais (`AI_QUOTA_EXCEEDED`, `GENERATION_IN_PROGRESS`, `AI_PROVIDER_UNAVAILABLE`) já existiam desde o Prompt 5C/Sprint 09, nunca usados até agora |
| Nova permissão no catálogo | 0 — `ai:summarize`/`ai:usage:read` já existiam desde o Prompt 5C, nunca usadas até agora |
| Achado real corrigido antes de commitar | Nenhum bug de segurança desta vez (diferente da Sprint 10) — o achado real foi de fiação: `SearchModule` não exportava `UniversalSearchUseCase`, corrigido para o Chat global poder reaproveitá-lo via DI |

## 0.3.6 Sprint 12 (Prompt 11) — Reorganização da Navegação: nenhuma mudança no backend

O Prompt 11 ("Reorganização da Navegação, Menus e Relacionamentos entre
Entidades") foi explicitamente uma rodada de frontend — reorganizar a
Sidebar, adicionar Breadcrumbs/painel "Relacionados"/"Ações rápidas" a
telas que já existiam, sem alterar API, contratos, DTOs ou permissões
("Não alterar APIs. Não alterar contratos. Não alterar DTOs. Não alterar
permissões existentes"). Nenhum arquivo de `apps/api/` foi tocado; os
comandos de validação do backend foram reexecutados como checagem de
regressão (nenhuma mudança esperada, nenhuma encontrada):

| Comando | Resultado |
|---|---|
| `npx prisma validate` | Válido (schema inalterado) |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "{src,test}/**/*.ts"` | 0 erros |
| `npx jest` | 55/55 suítes, **314/314 testes** — inalterado desde a Sprint 11 |
| `npm run build` (nest build) | Sucesso |

Ver `docs/frontend-implementation/00-status.md §0.5.9` para o que
realmente mudou nesta rodada (só `apps/web/`).

## 0.3.7 Sprint 13 (Prompt 12) — Permission Engine

Documentação completa: [21-permission-engine.md](21-permission-engine.md).
Resumo do que mudou (tudo evolutivo, zero reescrita):

- **`shared/authorization/`** (novo, `@Global()`): `hasPermission`/
  `hasAnyPermission`/`hasAllPermissions` (mirror backend do utilitário que
  só existia no frontend); `PermissionResolverService` (extraído de 3
  cópias quase idênticas em `LoginUseCase`/`RefreshTokenUseCase`/
  `SwitchOfficeUseCase` — **bug real corrigido**: só o login aplicava os
  overrides de `PermissaoUsuario`, refresh/troca de escritório não;
  segundo bug corrigido: `expiraEm` de um override nunca era comparado a
  `now()`); `field-security.ts` (`DataClassification` + `redactFields`);
  `SimulationGuard` (3º guard global).
- **`UpdateMemberRoleUseCase`**: corrigido um achado real de segurança —
  `novoPapelId` nunca era validado além de "é um UUID", permitindo
  atribuir a um membro um papel customizado de outro escritório.
- **`modules/permissions/`** (novo): CRUD de perfis customizados +
  catálogo, gated por `role:manage` (permissão nova), com "teto de
  privilégio" (nunca conceder o que o próprio ator não tem) e nível
  hierárquico sempre abaixo de quem cria.
- **2 perfis de sistema novos**: GESTOR, FINANCEIRO. Total agora 8.
- **Field Level Security** aplicada de ponta a ponta em Cliente (CPF/CNPJ/
  endereço, nova permissão `client:read:sensitive`) — DTO de detalhe,
  DTO de listagem, e Busca Global (que antes sempre mascarava,
  independente de permissão). **Revertida** pela Sprint "Remover
  mascaramento de dados do cliente em Processos" (ver
  docs/backend-implementation/21-permission-engine.md §21.4) — esses
  campos são dados de negócio, a proteção correta é por acesso ao
  recurso (`client:read`), não por campo.
- **Simulador real** (`X-Simulate-Membro-Id`) — mesma sessão, sem logout;
  nunca eleva privilégio (troca para as permissões REAIS do membro
  simulado); auditoria sempre atribui o ator real.
- Nenhuma migration nova — tudo aditivo a nível de dados (seed) ou lógica
  de aplicação; `Papel.escritorioId` (perfil customizado por escritório)
  já existia desde o Prompt 6A, só não tinha endpoint que o usasse.

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 11 |
| Arquivos TypeScript de produção modificados | 12 |
| Arquivos de teste novos/modificados | 9 (44 casos de teste novos) |
| `npx jest` (suíte completa) | 61/61 suítes, **358/358 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "{src,test}/**/*.ts"` | 0 erros |
| `npx prisma validate` / `generate` | Válido / sucesso (schema inalterado) |
| `npm run build` (nest build) | Sucesso |
| Novo código de erro | `ROLE_IN_USE` (409) |
| Novas permissões no catálogo | 11 (`role:manage`, `simulation:use`, `client:read:sensitive`, `report:metrics:read`, `financeiro:read`, `financeiro:honorarios:read`, `financeiro:salarios:read` — as últimas 3 catálogo-apenas, sem módulo ainda) |

## 0.3.8 Sprint 14 (Prompt 13) — Configuration Engine

Documentação completa: [22-configuration-engine.md](22-configuration-engine.md).
Resumo do que mudou:

- **Achado-chave**: `Escritorio.configuracoes` (Json, existia desde a Fase
  1, nunca lido/escrito) reaproveitado para Geral/Financeiro/IA — **zero
  migration nova** para essas 3 categorias.
- **`modules/configuration/`** (novo): 7 catálogos reais com CRUD completo
  (Campos Extras, Campos Obrigatórios, Conjuntos de Valores + Itens,
  Categorias de Tarefa, Grupos de Colaboradores + Membros, Modelos de
  Tarefa, Feriados) — migration nova `20260803000001_configuration_engine`
  (7 tabelas + 3 enums, aditiva, nunca aplicada contra Postgres real —
  mesma limitação de ambiente de sempre).
- **`GET /configuration/dashboard-summary`** reaproveita `AiUsageUseCase`
  (Sprint 11, agora exportado por `AiModule`) e `log_auditoria` — nenhum
  cálculo duplicado.
- **`AiQuotaService.checkQuota`** estendido (6 linhas) para respeitar
  `configuracoes.ia.cotaMensalPersonalizada` quando definida — mudança
  aditiva, contrato `QuotaStatus` inalterado.
- **3 permissões novas**: `configuration:read`, `configuration:manage`,
  `ai:manage`. `financeiro:read` (catálogo-apenas desde o Prompt 12) ganha
  seu primeiro ponto de aplicação real (`GET/PATCH /configuration/financial`).
- **1 código de erro novo**: `DUPLICATE_NAME` (409, genérico, reaproveitado
  pelos 7 catálogos).
- Exclusões conscientes (mesmo padrão de escopo de todas as rodadas):
  Campos Extras/Obrigatórios administráveis mas não conectados aos
  formulários de Cliente/Processo; Modelos de Tarefa/Feriados
  catálogo-apenas (módulos Tarefas/cálculo de dias úteis não existem
  ainda) — ver §22.6.

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 20 (`modules/configuration/`: 1 módulo, 9 use-cases, 1 schemas, 9 controllers) |
| Arquivos TypeScript de produção modificados | 8 (`app.module.ts`, `seed.ts`, `error-catalog.ts`, `ai.module.ts`, `ai-quota.service.ts`, `ai-provider.registry.ts`, `schema.prisma`) |
| Arquivos de teste novos/modificados | 10 (44 casos de teste novos) |
| `npx jest` (suíte completa) | 70/70 suítes, **402/402 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "src/**/*.ts"` | 0 erros |
| `npx prisma validate` / `generate` | Válido / sucesso |
| `npm run build` (nest build) | Sucesso |
| Migration nova | `20260803000001_configuration_engine` (7 tabelas, 3 enums, aditiva) |
| Novo código de erro | `DUPLICATE_NAME` (409) |
| Novas permissões no catálogo | 3 (`configuration:read`, `configuration:manage`, `ai:manage`) |

## 0.3.9 Sprint 15 (Prompt 14) — Task Engine

Documentação completa: [23-task-engine.md](23-task-engine.md).
Resumo do que mudou:

- **`modules/tasks/`** (novo): CRUD completo + ciclo de vida
  (archive/restore/duplicate/move/reopen/complete/cancel), checklist,
  dependências ("teto de bloqueio" de conclusão), recorrência síncrona
  (sem fila — não existe BullMQ neste projeto), vínculos multi-entidade (9
  tipos, 3 validados de verdade), favoritos, comentários mínimos
  (reaproveitando `Comentario`, schema da Fase 1, nunca implementado até
  agora), dashboard agregado, `GET /tasks/:id/timeline` (leitura).
- **Status/Prioridade nunca são enum fixo** — `TaskValueSetsService`
  auto-provisiona 2 Conjuntos de Valores (Configuration Engine, Prompt 13)
  por escritório na primeira criação de tarefa.
- **Categorias/Modelos de Tarefa (Prompt 13, catálogo-apenas) ganham seu
  primeiro consumidor real** — `CreateTaskFromTemplateUseCase`.
- **Generalizações**: `EventoTimeline`/`ResumoIA`/`FonteIA` ganham
  `tarefaId` (3ª/4ª vez do mesmo padrão aditivo); `TaskSearchAdapter` é o
  10º adapter da Busca Global.
- Migration nova `20260804000000_task_engine` (100% aditiva), nunca
  aplicada contra Postgres real — mesma limitação de ambiente de sempre.

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 29 (`modules/tasks/`: 1 módulo, 1 scope, 1 validation, 1 value-sets service, 1 recurrence, 17 use-cases, 1 schemas, 6 controllers) |
| Arquivos TypeScript de produção modificados | 13 (`app.module.ts`, `seed.ts`, `error-catalog.ts`, `schema.prisma`, `timeline-recorder.service.ts`, `request-summary.use-case.ts`, `ai-summary-lifecycle.use-cases.ts`, `resumo-access.ts`, `ai-summary.service.ts`, `ai-types.ts`, `prompt-template.ts`, `ai.module.ts`, `search-adapters.ts`, `search-types.ts`, `search.module.ts`, `universal-search.use-case.ts`) |
| Arquivos de teste novos/modificados | 20 (81 casos de teste novos) |
| `npx jest` (suíte completa) | 90/90 suítes, **483/483 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "src/**/*.ts"` | 0 erros |
| `npx prisma validate` / `generate` | Válido / sucesso |
| `npm run build` (nest build) | Sucesso |
| Migration nova | `20260804000000_task_engine` (7 tabelas, 2 enums, aditiva) |
| Novos códigos de erro | `TASK_DEPENDENCIES_PENDING` (409), `TASK_CHECKLIST_PENDING` (409) |
| Novas permissões no catálogo | 7 (`task:create`, `task:read:all`, `task:read:team`, `task:read:assigned`, `task:update`, `task:delete`, `task:team:manage`) |

## 0.3.10 Sprint 17 — Clientes e Contatos

Documentação completa: [24-clients-contacts.md](24-clients-contacts.md).
Resumo do que mudou:

- **`modules/clients/` ampliado** (não recriado — CRUD já existia desde o
  Prompt 7): `categoriaRelacionamento` (CLIENTE/CONTATO/CLIENTE_E_CONTATO,
  dimensão nova, independente de `tipo` PF/PJ), campos pessoais de Pessoa
  Física (`nomeMae`/`nomePai`/`estadoCivil`/`profissao`/`dataNascimento`,
  os 3 primeiros + data de nascimento entravam em `CLIENT_SENSITIVE_FIELD_
  RULES`, exigiam `client:read:sensitive` — regra removida pela Sprint
  "Remover mascaramento de dados do cliente em Processos", ver
  21-permission-engine.md §21.4), `avatarUrl` (URL simples — sem
  pipeline de upload próprio, ver pendências), `camposExtrasValores`
  (`Json`, valores dos Campos Extras do Configuration Engine — o motor só
  definia o metadado até agora, nunca tinha um consumidor real),
  `ClienteFavorito` (mesmo padrão de `TarefaFavorito`), filtros amplos em
  `GET /clients` (nome/telefone/celular/e-mail/CPF/CNPJ/categoria/nome da
  mãe/nome do pai/estado civil/profissão/dia-mês-ano de nascimento/data e
  período de cadastro/última alteração — `buildClientWhere` compartilhado
  com `GET /clients/export`), 6 opções de ordenação, `GET /clients/:id/
  timeline` (leitura, ver abaixo), `POST /clients/:id/favorite`.
- **Timeline do Cliente — restrição real desta Sprint**: `Timeline` está
  na lista "NÃO alterar" do prompt, mas `EventoTimeline` só tem escopo
  `processoId`/`tarefaId` (sem `clienteId`) — adicionar um exigiria mexer
  no Timeline Engine. Solução: `ListClientTimelineUseCase` (dentro de
  `modules/clients/`, não de `modules/timeline/`) lê os eventos que já são
  gravados com `entidadeRelacionadaTipo: 'cliente'`/`entidadeRelacionadaId`
  (fan-out por Processo vinculado, mecanismo que `UpdateClientUseCase` já
  usava desde a Sprint 08) e agrega numa lista única — nenhuma linha de
  `modules/timeline/**` foi tocada. Efeito colateral aceito e documentado:
  um cliente sem nenhum processo vinculado continua sem nenhum evento
  (limitação pré-existente, não nova); e o evento de **cadastro** do
  cliente nunca pode ser registrado por esse mecanismo (não há processo
  ainda no momento da criação) — pendência real, não contornável sem tocar
  o Timeline Engine.
- **Novas permissões**: `client:export` (adicionada a OWNER/ADMIN/SOCIO
  via herança automática do catálogo, e explicitamente a ADVOGADO/
  ASSISTENTE/GESTOR). Nenhuma outra do Permission Engine foi alterada — o
  prompt pedia `client:view`, que já existia como `client:read` desde o
  Prompt 7; renomear quebraria toda checagem existente sem necessidade,
  então o mapeamento foi documentado em vez de executado.
- **Exportação (CSV)**: `GET /clients/export` devolve até 5000 linhas
  (mesmos filtros de `GET /clients`, JSON simples) — o CSV é montado no
  navegador (`lib/api/client.ts`, o cliente HTTP compartilhado por todo o
  app, só fala JSON; estendê-lo para respostas binárias/texto ficaria fora
  do escopo desta Sprint, que é só o módulo Clientes).
- Migration nova `20260805000000_clients_contacts` (100% aditiva — 2 enums,
  8 colunas novas em `clientes`, 1 tabela nova), nunca aplicada contra
  Postgres real — mesma limitação de ambiente de sempre.

| Métrica | Valor |
|---|---|
| Arquivos TypeScript de produção criados | 3 (`client-query-filters.ts`, `client-favorites.use-case.ts`, `export-clients.use-case.ts`, `list-client-timeline.use-case.ts`) |
| Arquivos TypeScript de produção modificados | 8 (`schema.prisma`, `seed.ts`, `clients.module.ts`, `clients.controller.ts`, `client.schemas.ts`, `client-field-security.ts`, `create/update/get/list-client.use-case.ts`, `client-lifecycle.use-cases.ts`) |
| Arquivos de teste novos | 3 (`client-favorites`, `list-client-timeline`, `export-clients` — 13 casos novos) |
| `npx jest src/modules/clients` (escopado — regra de execução desta Sprint) | 7/7 suítes, **26/26 testes** — passou |
| `npx tsc --noEmit` (completo) | 0 erros |
| `npx eslint "src/modules/clients/**/*.ts" --fix` (escopado) | 0 erros |
| `npx prisma validate` / `generate` | Válido / sucesso |
| `npx nest build` (completo, verificação de não regressão) | Sucesso |
| Migration nova | `20260805000000_clients_contacts` (2 enums, 8 colunas, 1 tabela, aditiva) |
| Novas permissões no catálogo | 1 (`client:export`) |
| Suíte completa (`jest`, todos os módulos) | **Não executada nesta rodada** — regra de execução desta Sprint pede só o módulo alterado e módulos diretamente impactados; nenhum arquivo fora de `modules/clients/` e `prisma/` foi tocado, então a última execução completa (90/90 suítes, Sprint 15/UX Polish) continua válida como baseline |

## 0.4 Índice

| # | Arquivo |
|---|---|
| 01 | [Bootstrap](01-bootstrap.md) |
| 02 | [Banco de Dados](02-database.md) |
| 03 | [Multi-tenancy](03-multitenancy.md) |
| 04 | [Identity](04-identity.md) |
| 05 | [Offices e Memberships](05-offices-memberships.md) |
| 06 | [Users](06-users.md) *(pendente)* |
| 07 | [Clients](07-clients.md) *(pendente)* |
| 08 | [Legal Cases](08-legal-cases.md) *(pendente)* |
| 09 | [Deadlines e Timeline](09-deadlines-timeline.md) *(pendente)* |
| 10 | [Documents e Folders](10-documents-folders.md) *(pendente)* |
| 11 | [Comments e Tags](11-comments-tags.md) *(pendente)* |
| 12 | [Notifications](12-notifications.md) *(pendente)* |
| 13 | [Search](13-search.md) *(pendente)* |
| 14 | [AI](14-ai.md) *(pendente)* |
| 15 | [Audit](15-audit.md) *(parcial)* |
| 16 | [Observabilidade](16-observability.md) |
| 17 | [Testes](17-tests.md) |
| 18 | [Docker e CI](18-docker-ci.md) |
| 19 | [Decisões](19-decisions.md) |
| 20 | [Contexto para a próxima rodada](20-context-next-step.md) |
| 21 | [Permission Engine](21-permission-engine.md) |
| 22 | [Configuration Engine](22-configuration-engine.md) |
| 23 | [Task Engine](23-task-engine.md) |
| 24 | [Clientes e Contatos](24-clients-contacts.md) |

---

**Próximo:** [01-bootstrap.md](01-bootstrap.md)
