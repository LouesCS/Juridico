# 31 — Decisões, Conflitos e Riscos desta Etapa

## 31.1 Fato estrutural que molda toda esta arquitetura: 9 de 13 módulos são mock-only

**Situação.** `docs/backend-implementation/00-status.md` confirma que só
Identity, Offices, Memberships e Health têm código real; Audit só
escrita. Users, Clients, Legal Cases, Deadlines/Timeline, Documents/
Folders, Comments/Tags, Notifications, AI e Search existem apenas como
contrato (`docs/api/`).

**Impacto no frontend.** Esta arquitetura não pode assumir integração
ponta a ponta para nove das treze features — cada uma é desenhada contra
o contrato OpenAPI/Zod já oficial e roda contra MSW até o backend
correspondente existir (ver [28-mocks.md §28.1](28-mocks.md)). Isso
também significa que a ordem de implementação recomendada
(ver [32-context-next-step.md](32-context-next-step.md)) segue a mesma
ordem de prioridade já registrada para o backend
(`docs/backend-implementation/20-context-next-step.md`: Legal Cases é o
próximo módulo de backend a ganhar código real).

**Resolução.** Nenhuma feature é bloqueada por isso — a troca de mock
para integração real é, por desenho, uma troca de handler MSW, nunca de
componente ou de hook (reafirma [09-openapi.md §9.1](09-openapi.md) e
[01-arquitetura.md §1.5](01-arquitetura.md)).

## 31.2 Correção: chaves de query sem `officeId` em `docs/04`

**Conflito.** `docs/04-arquitetura-frontend.md §4.3` propôs chaves como
`['processos', 'lista', filtros]`, sem o escritório ativo. Numa aplicação
multi-tenant onde o mesmo processo/cliente/documento nunca deveria
aparecer fora do seu tenant, uma chave não escopada por tenant é uma
superfície de risco real: uma race entre `queryClient.clear()` (disparado
na troca de escritório) e um refetch concorrente (`refetchOnWindowFocus`)
poderia, em teoria, escrever/ler dado do escritório errado sob a mesma
chave.

**Impacto.** Risco de vazamento visual de dado entre tenants na janela
entre o clique de troca de escritório e o `clear()` completar.

**Correção proposta (menor mudança compatível).** Prefixar toda chave com
`['office', officeId, ...]` — a hierarquia interna de
`docs/04` (`'lista'`, `'detalhe'`, filtros) permanece idêntica, só ganha
um prefixo. Detalhado em [10-tanstack-query.md §10.2](10-tanstack-query.md).
Não é uma alternativa ao `queryClient.clear()` no switch — as duas
mitigações continuam ativas, cumulativas.

## 31.3 Reconciliação: árvore de pastas do Prompt 6A vs. `features/` de `docs/04`

**Situação.** O Prompt 6A sugeriu `modules/`, `services/`, `schemas/`
(únicos, no topo), `providers/`, `mocks/`, `test/`. `docs/04` já havia
decidido `features/` (não `modules/`) com `api/`/`schemas/` dentro de
cada feature.

**Resolução.** `docs/04` prevalece para o que já decidiu (nome
`features/`, `api/`/`schemas/` por feature); `providers/`, `mocks/`,
`test/` são adições que não conflitam (não existiam explicitamente antes)
— tabela completa de mapeamento em
[02-estrutura-pastas.md §2.2](02-estrutura-pastas.md).

## 31.4 Sem ferramenta de monorepo nesta etapa

Decisão deliberada de escopo, não uma lacuna: Turborepo/pnpm
workspaces/Nx não são introduzidos agora. `apps/web/` e `apps/api/`
continuam independentes. Reavaliar quando houver dor real de duplicação
(ex.: cópia manual de tipos gerados entre os dois apps) — ver
[01-arquitetura.md §1.7](01-arquitetura.md).

## 31.5 Risco monitorável: geração de tipos apenas, sem client completo

Decisão em [09-openapi.md §9.3](09-openapi.md): gerar só tipos
(`openapi-typescript`), escrever funções de API e hooks à mão. Risco: se
o catálogo de endpoints crescer muito além dos ~85 endpoints já
catalogados em `docs/api/`, o custo de manutenção manual pode superar o
ganho de controle fino sobre chaves/invalidação. Reavaliar com dado real
de esforço após a implementação de 3-4 módulos (Prompt 6B).

## 31.6 Pendência: agregados do Dashboard sem endpoint contratado

`docs/ux/05-dashboard.md` pede "Métricas de Carteira" (Processos Ativos,
Prazos em Risco, Processos Parados, Novos Clientes no Mês) — nenhum
endpoint agregado equivalente existe em `docs/api/`. Reafirma a instrução
do próprio Prompt 6A (§18: "caso o backend ainda não forneça algum
agregado, registre como dependência") — registrado aqui, não inventado um
endpoint. Ver [14-dashboard.md §14.2](14-dashboard.md).

## 31.7 Pendência: restauração de cliente

`docs/api/08-clients.md` define `DELETE /clients/:id` (soft delete) mas
não um endpoint de restauração equivalente ao de outros recursos —
tratado como pendência de contrato, não implementado no frontend até
existir. Ver [15-clients.md §15.4](15-clients.md).

## 31.8 Pendência: favoritos na Busca Global

`docs/ux/09-busca-global.md` prevê "Favoritos" com pequeno boost de
ranking; nenhum endpoint de favoritar existe em `docs/api/15-search.md`.
UI reservada, sem dado real, até o contrato existir. Ver
[21-search.md §21.4](21-search.md).

## 31.9 Pendência: campo de "resumo desatualizado" no DTO de IA

`docs/ux/06-processos.md §6.2.1` prevê um estado "desatualizado" quando as
fontes de um resumo mudam; `docs/api/14-ai.md` não expõe explicitamente
um campo para isso no DTO de `ResumoIA`. A UI já prevê o banner (ver
[22-ai.md §22.3](22-ai.md)), mas a lógica de quando exibi-lo depende de um
campo a confirmar quando o módulo AI for de fato especificado a esse
nível de detalhe na implementação.

## 31.10 Vitest (frontend) vs. Jest (backend) — inconsistência reconhecida, não corrigida

Registrado em [27-tests.md §27.1](27-tests.md): os dois apps usam
runners de teste diferentes, por serem as escolhas corretas para cada
ecossistema (Next.js/Vite-like vs. NestJS/Jest oficial). Não é tratado
como um problema a resolver — forçar uniformidade aqui trocaria uma
inconsistência cosmética por uma escolha pior em pelo menos um dos dois
apps.

## 31.11 Pendências de autenticação herdadas do backend

Reafirma [05-autenticacao.md §5.8](05-autenticacao.md) e
`docs/backend-implementation/20-context-next-step.md`: verificação de
e-mail, MFA e OAuth (Google/Microsoft) têm tela/fluxo desenhados aqui mas
**nenhum endpoint real no backend hoje**. A UI é construída contra o
contrato já aprovado (`docs/api/02-autenticacao.md`), mockada via MSW —
não é uma decisão nova desta etapa, é a mesma pendência já registrada no
lado do backend, agora refletida no frontend.

## 31.12 Pendências da UX já resolvidas pela etapa de API — não reabertas aqui

`docs/ux/20-contexto-proxima-etapa.md` listava 5 pendências explícitas
para a etapa de API (contrato de streaming SSE de IA, streaming de
notificações, payload de busca agrupado, SLAs de performance como
contrato, e os 4 endpoints "assumidos pela UI mas não contratados":
trocar escritório, marcar notificação em lote, mover documento entre
pastas, reordenar pastas). Todas as 5 já foram resolvidas em
`docs/api/02-autenticacao.md §2.9`, `docs/api/14-ai.md §14.3`,
`docs/api/13-notifications.md`, `docs/api/20-performance.md` e nos
endpoints correspondentes catalogados nos módulos de API — nenhuma
reaberta ou redecidida nesta etapa, só consumida como já fechada.

## 31.13 Risco geral herdado do backend

RLS ainda não aplicada contra Postgres real, CI/Docker do backend nunca
executados (`docs/backend-implementation/00-status.md`) — o frontend não
tem como compensar isso, mas registra a dependência: testes de integração
genuinamente ponta a ponta (frontend real + backend real + Postgres real)
só serão possíveis quando essa infraestrutura existir de fato.

---

**Anterior:** [30-ci.md](30-ci.md) · **Próximo:** [32-context-next-step.md](32-context-next-step.md)
