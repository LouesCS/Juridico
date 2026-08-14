# 28 — Mocks (MSW)

## 28.1 Dois papéis distintos para o MSW nesta arquitetura

Diferente de um projeto onde MSW só existe para teste, aqui o MSW cumpre
**dois papéis**, por causa do fato central já registrado em
[00-resumo.md §0.3](00-resumo.md): 9 dos 13 módulos de domínio não têm
backend real ainda.

1. **Desenvolvimento local** — `mocks/browser.ts` ativado via
   `NEXT_PUBLIC_API_MOCKING=enabled`, intercepta chamada real do
   `fetch` no navegador para os módulos ainda sem backend (Users, Clients,
   Legal Cases, Documents/Folders, Timeline, Comments/Tags,
   Notifications, AI, Search), enquanto Identity/Offices/Memberships
   passam direto para a API real (`apps/api/` rodando localmente) — um
   único worker MSW, handlers seletivos por módulo (não um "tudo mockado
   ou nada").
2. **Teste** — `mocks/server.ts` (Node, `setupServer`), usado por
   Vitest (unitário/componente/integração) e Playwright — **todos** os
   módulos mockados nesse contexto, mesmo Identity/Offices/Memberships
   (teste não deve depender de um backend de verdade rodando).

## 28.2 Handlers derivados do contrato, nunca inventados

Cada handler em `mocks/handlers/<modulo>.ts` é escrito contra os tipos
gerados em `lib/api/generated/` (ver [09-openapi.md](09-openapi.md)) — a
resposta mockada satisfaz o mesmo tipo que a resposta real satisfaria.
Isso não é uma garantia de contrato tão forte quanto contract testing
(que é responsabilidade do backend, `docs/backend/11-testes.md §11.4`),
mas impede o erro mais comum: mock que retorna um campo com nome
diferente do que o contrato define.

## 28.3 Cenários por endpoint (`mocks/scenarios/`)

Cada endpoint mockado tem, no mínimo, os cenários abaixo, selecionáveis
por teste (via `server.use(...)` sobrescrevendo o handler default) ou por
query param de desenvolvimento (`?mockScenario=empty`):

- Sucesso (dado típico, via factory — ver [27-tests.md](27-tests.md))
- Vazio (`data: []`, `pagination.hasMore: false`)
- Erro `401`/`404`/`409`/`422`/`429`/`5xx` (corpo `ApiError` real, ver
  [23-errors.md §23.1](23-errors.md))
- Paginação (`hasMore: true` + `nextCursor` válido, para testar scroll
  incremental/`useInfiniteQuery`)
- Processamento assíncrono (documento: sequência
  `PENDENTE`→`PROCESSANDO`→`PRONTO` ao longo de múltiplas chamadas
  simuladas, para exercitar o polling de fallback de
  [20-notifications-sse.md §20.5](20-notifications-sse.md) sem depender
  de SSE real no teste)

## 28.4 SSE mockado

`EventSource` não é interceptável pelo MSW da mesma forma que `fetch`
(MSW v2 intercepta `fetch`/XHR, não o protocolo de streaming do
`EventSource` nativo). Estratégia: um **mock de classe** substituindo
`window.EventSource` em teste (`test/setup.ts`), que emite eventos
programáticos (`token`, `source`, `done`, `error`, `notification.created`,
`heartbeat`) a partir de um roteiro definido por teste — usado pelos
testes de componente/integração de
[20-notifications-sse.md](20-notifications-sse.md) e
[22-ai.md](22-ai.md). Em desenvolvimento local (não teste), o mesmo
princípio se aplica via um pequeno servidor SSE de desenvolvimento
(`scripts/mock-sse-server.ts`, roda ao lado do MSW) para os dois módulos
ainda sem backend.

## 28.5 Upload mockado

Handler de `POST /documents/presign` retorna uma `uploadUrl` apontando
para um endpoint MSW local (não um bucket real) que aceita o `PUT` e
simula progresso via `ReadableStream` com atraso artificial — permite
testar a barra de progresso do `FileCard` sem depender de storage real,
coerente com o fato de nenhum `StoragePort` real existir ainda no backend
(ver [18-documents-folders.md](18-documents-folders.md)).

## 28.6 Mocks não devem divergir do contrato oficial

Regra de CI (ver [30-ci.md §30.2](30-ci.md)): a mesma regeneração de
tipos que valida `lib/api/generated/` roda antes dos testes que usam
MSW — um handler que não compila contra o tipo atualizado é um sinal de
que o mock ficou para trás do contrato, pego em tempo de build, não em
produção.

---

**Anterior:** [27-tests.md](27-tests.md) · **Próximo:** [29-observability.md](29-observability.md)
