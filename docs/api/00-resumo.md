# 00 — Resumo da Especificação Oficial da API

> **Escopo:** contrato completo da API REST do Quilombo Dev — convenções,
> autenticação, autorização, todos os endpoints da Fase 1, DTOs, tratamento de
> erro, performance e segurança — em nível de detalhe suficiente para o
> Frontend (Next.js) e o Backend (NestJS) serem desenvolvidos em paralelo sem
> decisão de contrato em aberto.
>
> **Esta pasta é a fonte única da verdade da API.** Eleva para o nível de
> contrato HTTP o que já estava decidido em
> [`../05-arquitetura-backend.md`](../05-arquitetura-backend.md) (módulos,
> camadas, autenticação, autorização, filas, IA, API §5.11),
> [`../database/`](../database/00-resumo-modelagem.md) (entidades, permissões,
> multi-tenancy) e [`../ux/`](../ux/00-resumo.md) (telas, fluxos, pendências de
> contrato explicitamente deixadas para esta etapa). **Não redefine
> arquitetura, banco de dados, entidades, papéis ou telas.**
>
> **O que esta pasta NÃO faz:** não escreve código NestJS, Controllers,
> Services, Prisma ou SQL · não gera React · não altera nenhuma decisão já
> tomada nas três etapas anteriores.

---

## 0.1 Como ler esta pasta

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-resumo.md](00-resumo.md) | Este documento |
| 01 | [01-convencoes.md](01-convencoes.md) | Versão, prefixo, formato, paginação, filtros, erros, headers |
| 02 | [02-autenticacao.md](02-autenticacao.md) | Mecanismo de autenticação — JWT, OAuth, cookies, ciclo de vida de token |
| 03 | [03-autorizacao.md](03-autorizacao.md) | RBAC, ownership, segredo de justiça, escopos |
| 04 | [04-identity.md](04-identity.md) | Endpoints: login, logout, refresh, me, sessões, senha |
| 05 | [05-offices.md](05-offices.md) | Endpoints: escritório |
| 06 | [06-memberships.md](06-memberships.md) | Endpoints: convites, membros, papéis |
| 07 | [07-users.md](07-users.md) | Endpoints: perfil, foto, preferências |
| 08 | [08-clients.md](08-clients.md) | Endpoints: clientes |
| 09 | [09-legal-cases.md](09-legal-cases.md) | Endpoints: processos, equipe, participantes, prazos, tags |
| 10 | [10-documents.md](10-documents.md) | Endpoints: documentos, upload, versões, pastas |
| 11 | [11-timeline.md](11-timeline.md) | Endpoints: timeline |
| 12 | [12-comments.md](12-comments.md) | Endpoints: comentários |
| 13 | [13-notifications.md](13-notifications.md) | Endpoints: notificações, preferências, tempo real |
| 14 | [14-ai.md](14-ai.md) | Endpoints: resumo por IA, streaming, custo, fontes |
| 15 | [15-search.md](15-search.md) | Endpoints: busca global, autocomplete |
| 16 | [16-audit.md](16-audit.md) | Endpoints: auditoria |
| 17 | [17-errors.md](17-errors.md) | Estrutura única de erro, catálogo de status HTTP |
| 18 | [18-dtos.md](18-dtos.md) | Catálogo de todos os DTOs — campos, tipos, validação |
| 19 | [19-openapi.md](19-openapi.md) | Estrutura da especificação OpenAPI 3.1 |
| 20 | [20-performance.md](20-performance.md) | Cache, compressão, N+1, batch, timeout |
| 21 | [21-seguranca.md](21-seguranca.md) | JWT, CSRF, CORS, IDOR, LGPD, auditoria |
| 22 | [22-decisoes.md](22-decisoes.md) | Conflitos, decisões e riscos desta etapa |
| 23 | [23-contexto-proxima-etapa.md](23-contexto-proxima-etapa.md) | Contexto oficial para o Prompt 5 (implementação Backend) |

## 0.2 Princípios da API

| Princípio | Aplicação |
|---|---|
| REST sobre HTTP, JSON | Reafirma [../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md) |
| Um endpoint, uma intenção | Espelha "um use case = uma intenção do usuário" da arquitetura backend |
| Contrato antes de implementação | Esta pasta é escrita e aprovada antes de qualquer Controller existir |
| Tenant sempre implícito no token, nunca em parâmetro de URL/body | Reafirma [../database/01-estrategia-multitenancy.md §1.2](../database/01-estrategia-multitenancy.md) |
| Erro estruturado e previsível | RFC 9457 Problem Details em 100% das respostas de erro |
| Paginação por cursor em toda listagem de volume | Reafirma [../database/02-convencoes-dados.md §2.15](../database/02-convencoes-dados.md) |
| A API serve a experiência documentada em `docs/ux/`, não o contrário | Todo endpoint existe porque uma tela em `docs/ux/05` a `11` o requer |

## 0.3 O que já estava decidido e o que esta etapa formaliza

| Já decidido | Formalizado nesta etapa |
|---|---|
| REST, `/api/v1`, OpenAPI 3.1, paginação por cursor, RFC 9457, idempotência, rate limit, SSE ([../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md)) | Contrato completo de cada endpoint, com request/response de exemplo |
| JWT com rotação e detecção de reuso, OAuth 2.0+PKCE, MFA TOTP ([../05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md)) | Endpoints exatos de login/refresh/OAuth/MFA, formato de payload do JWT |
| RBAC + escopo de recurso ([../database/08-permissoes-seguranca.md](../database/08-permissoes-seguranca.md)) | `Permissão` documentada por endpoint, com resolução de escopo explícita |
| Telas e fluxos que consomem a API ([../ux/05](../ux/05-dashboard.md) a [11](../ux/11-notificacoes.md)) | Endpoint que sustenta cada elemento de tela, incluindo os que a UX deixou pendentes (trocar escritório, mover documento, streaming de IA, tempo real de notificação) |

## 0.4 Pendências da etapa de UX resolvidas aqui

Reafirma [../ux/20-contexto-proxima-etapa.md](../ux/20-contexto-proxima-etapa.md):

1. Contrato de streaming SSE para resumo de IA → [14-ai.md §14.3](14-ai.md).
2. Contrato de tempo real para notificações → [13-notifications.md §13.5](13-notifications.md).
3. Payload de busca global agrupado por tipo → [15-search.md](15-search.md).
4. Metas de tempo de resposta como contrato, não só meta de produto →
   [20-performance.md](20-performance.md).
5. Endpoints não contratados: trocar escritório ([04-identity.md §4.7](04-identity.md)),
   marcar notificação em lote ([13-notifications.md §13.4](13-notifications.md)),
   mover documento entre pastas e reordenar pastas ([10-documents.md §10.6](10-documents.md)).

---

**Próximo:** [01-convencoes.md](01-convencoes.md)
