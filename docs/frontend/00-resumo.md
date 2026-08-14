# 00 — Resumo da Arquitetura Oficial do Frontend

> **Escopo:** arquitetura completa do frontend do Quilombo Dev — estrutura
> de projeto, App Router, autenticação, autorização, contexto de escritório,
> cliente HTTP, OpenAPI/tipos, TanStack Query, estado global, formulários,
> Design System, arquitetura por módulo de domínio, SSE, uploads, busca, IA,
> erros, acessibilidade, segurança, performance, testes, mocks,
> observabilidade e CI — em nível de detalhe suficiente para a implementação
> (Prompt 6B) começar sem decisão de projeto em aberto.
>
> **Esta pasta eleva para o nível de projeto Next.js** o que já estava
> decidido em [`../04-arquitetura-frontend.md`](../04-arquitetura-frontend.md)
> (stack, princípios gerais), [`../ux/`](../ux/00-resumo.md) (telas, fluxos,
> Design System, componentes, acessibilidade — tratado como **imutável**,
> reafirma `ux/20-contexto-proxima-etapa.md`: "a API é construída para
> servir esta experiência, não o contrário", e o mesmo vale para o
> frontend) e [`../api/`](../api/00-resumo.md) +
> [`../backend-implementation/`](../backend-implementation/00-status.md)
> (contrato HTTP real, o que já está implementado versus apenas
> especificado). **Não redefine nenhuma decisão anterior; não implementa
> telas.**
>
> **O que esta pasta NÃO faz:** não escreve páginas completas · não gera
> componentes React finais · não redefine UX/UI · não altera contrato de
> API · não inventa endpoints · não afirma que algo foi implementado (esta
> etapa é arquitetural, como o Prompt 5A foi para o backend).

---

## 0.1 Como ler esta pasta

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-resumo.md](00-resumo.md) | Este documento |
| 01 | [01-arquitetura.md](01-arquitetura.md) | Visão geral, stack, princípios de camadas |
| 02 | [02-estrutura-pastas.md](02-estrutura-pastas.md) | Árvore de pastas completa, responsabilidade e regras de import |
| 03 | [03-rotas.md](03-rotas.md) | Árvore oficial de rotas, dado/permissão/estado por rota |
| 04 | [04-app-router.md](04-app-router.md) | Route groups, layouts, Server/Client/Server Action/Route Handler/Middleware |
| 05 | [05-autenticacao.md](05-autenticacao.md) | Cookies httpOnly, refresh, MFA, OAuth, múltiplas abas |
| 06 | [06-autorizacao.md](06-autorizacao.md) | RBAC, `Can`/`PermissionGate`/`RoleGate`, 404 de sigilo |
| 07 | [07-office-context.md](07-office-context.md) | Troca de escritório, invalidação de cache, SSE |
| 08 | [08-http-client.md](08-http-client.md) | Cliente HTTP central, erros, retries, upload/download |
| 09 | [09-openapi.md](09-openapi.md) | Geração de tipos, Zod, sincronização com backend, CI |
| 10 | [10-tanstack-query.md](10-tanstack-query.md) | Query keys, invalidação, SSR/hydration, paginação por cursor |
| 11 | [11-estado-global.md](11-estado-global.md) | Zustand — o que entra e o que não entra |
| 12 | [12-formularios.md](12-formularios.md) | React Hook Form + Zod, máscaras, erros `422` |
| 13 | [13-design-system.md](13-design-system.md) | Tokens, shadcn/ui, catálogo de ~35 componentes |
| 14 | [14-dashboard.md](14-dashboard.md) | Arquitetura do Dashboard |
| 15 | [15-clients.md](15-clients.md) | Arquitetura de Clientes |
| 16 | [16-legal-cases.md](16-legal-cases.md) | Arquitetura de Processos |
| 17 | [17-deadlines-timeline.md](17-deadlines-timeline.md) | Arquitetura de Prazos e Timeline |
| 18 | [18-documents-folders.md](18-documents-folders.md) | Arquitetura de Documentos e Pastas |
| 19 | [19-comments-tags.md](19-comments-tags.md) | Arquitetura de Comentários e Tags |
| 20 | [20-notifications-sse.md](20-notifications-sse.md) | Notificações e gerenciador de SSE |
| 21 | [21-search.md](21-search.md) | Busca Global |
| 22 | [22-ai.md](22-ai.md) | Interface de IA |
| 23 | [23-errors.md](23-errors.md) | Tratamento global e local de erros |
| 24 | [24-accessibility.md](24-accessibility.md) | Acessibilidade — implementação e verificação |
| 25 | [25-security.md](25-security.md) | Segurança frontend |
| 26 | [26-performance.md](26-performance.md) | Performance |
| 27 | [27-tests.md](27-tests.md) | Estratégia de testes |
| 28 | [28-mocks.md](28-mocks.md) | MSW |
| 29 | [29-observability.md](29-observability.md) | Observabilidade frontend |
| 30 | [30-ci.md](30-ci.md) | Pipeline de CI do frontend |
| 31 | [31-decisions.md](31-decisions.md) | Conflitos, decisões e riscos desta etapa |
| 32 | [32-context-next-step.md](32-context-next-step.md) | Contexto oficial para o Prompt 6B (implementação) |

## 0.2 Stack (reafirmada e decidida nesta etapa)

Next.js (App Router) · React · TypeScript strict · Tailwind CSS · shadcn/ui ·
TanStack Query · React Hook Form · Zod · Zustand (uso restrito) ·
`openapi-typescript` (tipos a partir do OpenAPI oficial) · Vitest + React
Testing Library (justificativa em [27-tests.md §27.1](27-tests.md)) ·
Playwright · MSW · ESLint · Prettier.

## 0.3 Fato mais importante para calibrar esta arquitetura

**Só quatro módulos de backend têm código real hoje:** Identity, Offices,
Memberships e Health (mais Audit, só em escrita). Os outros 9 módulos do
catálogo de API (Users, Clients, Legal Cases, Documents/Folders, Timeline,
Comments/Tags, Notifications, AI, Search) existem **apenas como contrato
OpenAPI/Zod**, sem controller/use case implementado — ver
[`../backend-implementation/00-status.md`](../backend-implementation/00-status.md).
Esta arquitetura é desenhada para os 13 módulos de domínio, mas a
implementação real (Prompt 6B) só poderá integrar de ponta a ponta contra
Identity/Offices/Memberships; todo o resto roda contra **mock (MSW)
derivado do mesmo contrato OpenAPI** até o backend correspondente existir —
ver [31-decisions.md §31.1](31-decisions.md) e
[28-mocks.md](28-mocks.md).

## 0.4 Princípio geral desta etapa

Esta pasta responde à mesma pergunta que `docs/backend/` respondeu para o
NestJS: **como o código Next.js é organizado em disco e em módulo**, dado
tudo que já foi decidido sobre produto, dados, UX e API. Nenhuma tela é
implementada aqui — é a ponte entre "o que a experiência precisa fazer"
(UX) e "como o código é escrito" (Prompt 6B).

## 0.5 Decisões do backend que este documento respeita integralmente

Prefixo `/api/v1` · JSON `camelCase` · autenticação via cookies `httpOnly`
(`access_token`/`refresh_token`, `SameSite=Lax`) · refresh rotativo com
detecção de reuso · troca de escritório via `POST /v1/auth/switch-office` ·
multi-tenant exclusivamente por claim do JWT (nenhum endpoint aceita
`escritorioId` como parâmetro) · RBAC com policy contextual · `404` (nunca
`403`) para segredo de justiça/confidencialidade · sem batch update
genérico na Fase 1 · paginação por cursor · erro RFC 9457 + `timestamp` ·
SSE via cookie `httpOnly` + `EventSource` nativo · nenhum token em query
string · upload por URL assinada (presign/confirm) · Zod como fonte de
schemas no backend · OpenAPI como contrato.

---

**Próximo:** [01-arquitetura.md](01-arquitetura.md)
