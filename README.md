# Quilombo Dev — Workspace Jurídico Inteligente

PRD Arquitetural · v1.0 · 30/07/2026

SaaS de workspace jurídico para escritórios de advocacia de pequeno e médio porte.
Centraliza processos, documentos e prazos, e devolve a informação certa em
segundos por meio de busca global e resumos gerados por IA.

> Este repositório contém a documentação arquitetural completa do produto
> (`docs/`) e, a partir da Fase 1, uma implementação real e parcial do
> backend em [`apps/api/`](apps/api/) (NestJS + Prisma) e do frontend em
> [`apps/web/`](apps/web/) (Next.js) — ver
> [status do backend](docs/backend-implementation/00-status.md) e
> [status do frontend](docs/frontend-implementation/00-status.md) para
> o que já roda de fato (build, testes) versus o que ainda é só
> especificação ou migration escrita e não aplicada (RLS, extensões de
> busca — sem Postgres/Docker neste ambiente).

## Documentação

Comece pelo **[Resumo Executivo](docs/00-resumo-executivo.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo Executivo](docs/00-resumo-executivo.md) |
| 01 | [Visão de Produto](docs/01-visao-produto.md) |
| 02 | [Personas](docs/02-personas.md) |
| 03 | [Fluxos e Árvore de Telas](docs/03-fluxos-e-telas.md) |
| 04 | [Arquitetura Frontend](docs/04-arquitetura-frontend.md) |
| 05 | [Arquitetura Backend](docs/05-arquitetura-backend.md) |
| 06 | [Modelo de Domínio](docs/06-modelo-dominio.md) |
| 07 | [Design System](docs/07-design-system.md) |
| 08 | [Especificação dos Módulos](docs/08-especificacao-modulos.md) |
| 09 | [Segurança e LGPD](docs/09-seguranca-lgpd.md) |
| 10 | [Roadmap e Decisões Técnicas](docs/10-roadmap-e-decisoes.md) |

### Modelagem de Dados (Fase 1)

Detalhamento em nível de banco de dados (PostgreSQL + Prisma) da arquitetura
acima — comece por **[docs/database/00-resumo-modelagem.md](docs/database/00-resumo-modelagem.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo da Modelagem](docs/database/00-resumo-modelagem.md) |
| 01 | [Estratégia de Multi-tenancy](docs/database/01-estrategia-multitenancy.md) |
| 02 | [Convenções de Dados](docs/database/02-convencoes-dados.md) |
| 03 | [Entidades — Identidade e Escritórios](docs/database/03-entidades-identidade-escritorios.md) |
| 04 | [Entidades — Clientes e Processos](docs/database/04-entidades-clientes-processos.md) |
| 05 | [Entidades — Documentos e Colaboração](docs/database/05-entidades-documentos-colaboracao.md) |
| 06 | [Entidades — IA, Notificações e Auditoria](docs/database/06-entidades-ia-notificacoes-auditoria.md) |
| 07 | [Relacionamentos e Diagrama ER](docs/database/07-relacionamentos-diagrama-er.md) |
| 08 | [Permissões e Segurança](docs/database/08-permissoes-seguranca.md) |
| 09 | [Índices, Busca e Performance](docs/database/09-indices-busca-performance.md) |
| 10 | [Soft Delete, Retenção e LGPD](docs/database/10-soft-delete-retencao-lgpd.md) |
| 11 | [Prisma, Migrações e Seed](docs/database/11-prisma-migracoes-seed.md) |
| 12 | [Eventos, Fluxos e Regras](docs/database/12-eventos-fluxos-regras.md) |
| 13 | [Decisões, Riscos e Próxima Etapa](docs/database/13-decisoes-riscos-proxima-etapa.md) |

### UX/UI, Design System e Wireframes

Especificação completa de experiência do usuário — comece por
**[docs/ux/00-resumo.md](docs/ux/00-resumo.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo](docs/ux/00-resumo.md) |
| 01 | [Filosofia e Design Principles](docs/ux/01-design-principles.md) |
| 02 | [Personas (lente de UX)](docs/ux/02-personas.md) |
| 03 | [Jornadas do Usuário](docs/ux/03-user-journeys.md) |
| 04 | [Mapa de Navegação](docs/ux/04-navigation.md) |
| 05 | [Dashboard](docs/ux/05-dashboard.md) |
| 06 | [Tela do Processo](docs/ux/06-processos.md) |
| 07 | [Tela de Documentos](docs/ux/07-documentos.md) |
| 08 | [Tela de Clientes](docs/ux/08-clientes.md) |
| 09 | [Busca Global](docs/ux/09-busca-global.md) |
| 10 | [Perfil](docs/ux/10-perfil.md) |
| 11 | [Notificações](docs/ux/11-notificacoes.md) |
| 12 | [Design System (complemento)](docs/ux/12-design-system.md) |
| 13 | [Catálogo de Componentes](docs/ux/13-componentes.md) |
| 14 | [UX Writing](docs/ux/14-ux-writing.md) |
| 15 | [Acessibilidade](docs/ux/15-acessibilidade.md) |
| 16 | [Wireframes](docs/ux/16-wireframes.md) |
| 17 | [Responsividade](docs/ux/17-responsividade.md) |
| 18 | [Checklists](docs/ux/18-checklists.md) |
| 19 | [Decisões e Riscos](docs/ux/19-decisoes.md) |
| 20 | [Contexto para o Prompt 4](docs/ux/20-contexto-proxima-etapa.md) |

### Especificação Oficial da API (OpenAPI 3.1)

Contrato completo de todos os endpoints — comece por
**[docs/api/00-resumo.md](docs/api/00-resumo.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo](docs/api/00-resumo.md) |
| 01 | [Convenções Gerais](docs/api/01-convencoes.md) |
| 02 | [Autenticação (mecanismo)](docs/api/02-autenticacao.md) |
| 03 | [Autorização](docs/api/03-autorizacao.md) |
| 04 | [Identity](docs/api/04-identity.md) |
| 05 | [Offices](docs/api/05-offices.md) |
| 06 | [Memberships](docs/api/06-memberships.md) |
| 07 | [Users](docs/api/07-users.md) |
| 08 | [Clients](docs/api/08-clients.md) |
| 09 | [Legal Cases](docs/api/09-legal-cases.md) |
| 10 | [Documents](docs/api/10-documents.md) |
| 11 | [Timeline](docs/api/11-timeline.md) |
| 12 | [Comments](docs/api/12-comments.md) |
| 13 | [Notifications](docs/api/13-notifications.md) |
| 14 | [AI](docs/api/14-ai.md) |
| 15 | [Search](docs/api/15-search.md) |
| 16 | [Audit](docs/api/16-audit.md) |
| 17 | [Tratamento de Erros](docs/api/17-errors.md) |
| 18 | [Catálogo de DTOs](docs/api/18-dtos.md) |
| 19 | [Estrutura OpenAPI 3.1](docs/api/19-openapi.md) |
| 20 | [Performance](docs/api/20-performance.md) |
| 21 | [Segurança](docs/api/21-seguranca.md) |
| 22 | [Decisões e Riscos](docs/api/22-decisoes.md) |
| 23 | [Contexto para o Prompt 5](docs/api/23-contexto-proxima-etapa.md) |

### Arquitetura Oficial do Backend (NestJS)

Estrutura de implementação — comece por
**[docs/backend/00-resumo.md](docs/backend/00-resumo.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo](docs/backend/00-resumo.md) |
| 01 | [Arquitetura e Estrutura de Pastas](docs/backend/01-arquitetura.md) |
| 02 | [Módulos](docs/backend/02-modulos.md) |
| 03 | [Camadas](docs/backend/03-camadas.md) |
| 04 | [Dependências entre Módulos](docs/backend/04-dependencias.md) |
| 05 | [Autenticação (implementação)](docs/backend/05-autenticacao.md) |
| 06 | [Autorização (implementação)](docs/backend/06-autorizacao.md) |
| 07 | [Storage](docs/backend/07-storage.md) |
| 08 | [Cache](docs/backend/08-cache.md) |
| 09 | [Filas (BullMQ)](docs/backend/09-filas.md) |
| 10 | [Observabilidade](docs/backend/10-observabilidade.md) |
| 11 | [Testes](docs/backend/11-testes.md) |
| 12 | [Docker e Docker Compose](docs/backend/12-docker.md) |
| 13 | [Decisões e Riscos](docs/backend/13-decisoes.md) |
| 14 | [Contexto para o Prompt 5B](docs/backend/14-contexto-proxima-etapa.md) |

### Implementação do Backend (código real em `apps/api/`)

Status verificado (build/typecheck/lint/testes rodados de fato) — comece por
**[docs/backend-implementation/00-status.md](docs/backend-implementation/00-status.md)**.

| # | Documento |
|---|---|
| 00 | [Status](docs/backend-implementation/00-status.md) |
| 01 | [Bootstrap](docs/backend-implementation/01-bootstrap.md) |
| 02 | [Banco de Dados](docs/backend-implementation/02-database.md) |
| 03 | [Multi-tenancy](docs/backend-implementation/03-multitenancy.md) |
| 04 | [Identity](docs/backend-implementation/04-identity.md) |
| 05 | [Offices e Memberships](docs/backend-implementation/05-offices-memberships.md) |
| 06–15 | Users, Clients, Legal Cases, Deadlines/Timeline, Documents/Folders, Comments/Tags, Notifications, Search, AI, Audit *(pendentes — ver cada arquivo)* |
| 16 | [Observabilidade](docs/backend-implementation/16-observability.md) |
| 17 | [Testes](docs/backend-implementation/17-tests.md) |
| 18 | [Docker e CI](docs/backend-implementation/18-docker-ci.md) |
| 19 | [Decisões e Riscos](docs/backend-implementation/19-decisions.md) |
| 20 | [Contexto para o Prompt 6A](docs/backend-implementation/20-context-next-step.md) |

### Arquitetura Oficial do Frontend (Next.js)

Estrutura de implementação do frontend — nenhuma tela foi implementada
nesta etapa, apenas arquitetura. Comece por
**[docs/frontend/00-resumo.md](docs/frontend/00-resumo.md)**.

| # | Documento |
|---|---|
| 00 | [Resumo](docs/frontend/00-resumo.md) |
| 01 | [Arquitetura](docs/frontend/01-arquitetura.md) |
| 02 | [Estrutura de Pastas](docs/frontend/02-estrutura-pastas.md) |
| 03 | [Rotas](docs/frontend/03-rotas.md) |
| 04 | [App Router](docs/frontend/04-app-router.md) |
| 05 | [Autenticação](docs/frontend/05-autenticacao.md) |
| 06 | [Autorização](docs/frontend/06-autorizacao.md) |
| 07 | [Contexto de Escritório](docs/frontend/07-office-context.md) |
| 08 | [Cliente HTTP](docs/frontend/08-http-client.md) |
| 09 | [OpenAPI e Tipos](docs/frontend/09-openapi.md) |
| 10 | [TanStack Query](docs/frontend/10-tanstack-query.md) |
| 11 | [Estado Global](docs/frontend/11-estado-global.md) |
| 12 | [Formulários](docs/frontend/12-formularios.md) |
| 13 | [Design System](docs/frontend/13-design-system.md) |
| 14–22 | Dashboard, Clientes, Processos, Prazos/Timeline, Documentos/Pastas, Comentários/Tags, Notificações/SSE, Busca, IA |
| 23 | [Erros](docs/frontend/23-errors.md) |
| 24 | [Acessibilidade](docs/frontend/24-accessibility.md) |
| 25 | [Segurança](docs/frontend/25-security.md) |
| 26 | [Performance](docs/frontend/26-performance.md) |
| 27 | [Testes](docs/frontend/27-tests.md) |
| 28 | [Mocks (MSW)](docs/frontend/28-mocks.md) |
| 29 | [Observabilidade](docs/frontend/29-observability.md) |
| 30 | [CI](docs/frontend/30-ci.md) |
| 31 | [Decisões e Riscos](docs/frontend/31-decisions.md) |
| 32 | [Contexto para o Prompt 6B](docs/frontend/32-context-next-step.md) |

### Implementação do Frontend (código real em `apps/web/`)

Status verificado (build/typecheck/lint/testes rodados de fato) — comece
por **[docs/frontend-implementation/00-status.md](docs/frontend-implementation/00-status.md)**.

| # | Documento |
|---|---|
| 00 | [Status](docs/frontend-implementation/00-status.md) |
| 01 | [Bootstrap](docs/frontend-implementation/01-bootstrap.md) |
| 02 | [Design System](docs/frontend-implementation/02-design-system.md) |
| 03 | [HTTP e OpenAPI](docs/frontend-implementation/03-http-openapi.md) |
| 04 | [Autenticação](docs/frontend-implementation/04-auth.md) |
| 05 | [Office Context](docs/frontend-implementation/05-office-context.md) |
| 06 | [Shell e Navegação](docs/frontend-implementation/06-shell-navigation.md) |
| 07 | [Team e Memberships](docs/frontend-implementation/07-team.md) |
| 08 | [Dashboard](docs/frontend-implementation/08-dashboard.md) |
| 09 | [Users e Profile](docs/frontend-implementation/09-users.md) |
| 10–17 | Clients, Legal Cases, Deadlines/Timeline, Documents/Folders, Comments/Tags, Notifications/SSE, Search, AI *(pendentes — ver cada arquivo)* |
| 18 | [Testes](docs/frontend-implementation/18-tests.md) |
| 19 | [Decisões e Riscos](docs/frontend-implementation/19-decisions.md) |
| 20 | [Docker e CI](docs/frontend-implementation/20-docker-ci.md) |
| 21 | [Contexto para o Prompt 7](docs/frontend-implementation/21-context-next-step.md) |

**Rodar localmente:**
```bash
cd apps/web
cp .env.example .env.local
npm install
npx vitest run    # 53/53 testes passam sem precisar de backend
npm run build
```

**Rodar localmente (backend):**
```bash
cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx jest          # 38/38 testes passam sem precisar de banco
npm run build
```

Migrations reais já existem em `apps/api/prisma/migrations/` (init +
Row-Level Security + extensões de busca) e um teste de integração via
Testcontainers em `apps/api/test/integration/` (`npm run test:integration`)
— nenhum dos dois foi executado neste repositório por falta de
Docker/Postgres no ambiente de desenvolvimento; ambos rodam assim que houver
Docker disponível.

## Stack definida

**Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind 4 · shadcn/ui ·
TanStack Query · Zustand · React Hook Form + Zod
**Backend:** NestJS · PostgreSQL 16 (pgvector, pg_trgm, RLS) · Prisma · Redis ·
BullMQ · S3-compatible
**IA:** RAG com pgvector · padrão port/adapter · streaming via SSE

## Escopo do MVP

Login · Dashboard · Processos · Documentos · Busca Global · Resumo por IA ·
Perfil · Notificações (+ Clientes e Administração como pré-requisitos estruturais).
