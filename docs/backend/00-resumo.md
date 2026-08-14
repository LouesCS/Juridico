# 00 — Resumo da Arquitetura Oficial do Backend (NestJS)

> **Escopo:** projeto completo da arquitetura de implementação do backend —
> estrutura de pastas, módulos, camadas, dependências, autenticação,
> autorização, storage, filas, cache, observabilidade, testes e Docker — em
> nível de detalhe suficiente para a implementação (Prompt 5B) começar sem
> decisão de projeto em aberto.
>
> **Esta pasta eleva para o nível de projeto NestJS** o que já estava
> decidido em [`../05-arquitetura-backend.md`](../05-arquitetura-backend.md)
> (módulos, camadas, multi-tenancy, filas, IA), 
> [`../database/`](../database/00-resumo-modelagem.md) (entidades, Prisma,
> RLS) e [`../api/`](../api/00-resumo.md) (contrato HTTP, DTOs, OpenAPI).
> **Não redefine nenhuma decisão anterior; não implementa regras de negócio.**
>
> **O que esta pasta NÃO faz:** não escreve Controllers, Services, Prisma
> schema ou migrations · não implementa regra de negócio · não altera
> arquitetura, modelagem de dados, UX ou contrato de API já oficiais.

---

## 0.1 Como ler esta pasta

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-resumo.md](00-resumo.md) | Este documento |
| 01 | [01-arquitetura.md](01-arquitetura.md) | Monólito modular, estrutura de pastas completa do projeto NestJS |
| 02 | [02-modulos.md](02-modulos.md) | Todos os módulos — responsabilidades, dependências, eventos |
| 03 | [03-camadas.md](03-camadas.md) | Domain, Application, Infrastructure, Interface — anatomia de um módulo |
| 04 | [04-dependencias.md](04-dependencias.md) | Grafo de dependência entre módulos, regras de acoplamento |
| 05 | [05-autenticacao.md](05-autenticacao.md) | Passport, JWT, estratégias, guards |
| 06 | [06-autorizacao.md](06-autorizacao.md) | RBAC, Policies, decorators, autorização de recurso |
| 07 | [07-storage.md](07-storage.md) | Abstração de storage, S3, URLs assinadas, versionamento |
| 08 | [08-cache.md](08-cache.md) | Redis, TTL, invalidação |
| 09 | [09-filas.md](09-filas.md) | BullMQ — filas, jobs, workers |
| 10 | [10-observabilidade.md](10-observabilidade.md) | Logs, tracing, métricas, health checks |
| 11 | [11-testes.md](11-testes.md) | Unitário, integração, E2E, contract testing |
| 12 | [12-docker.md](12-docker.md) | Docker Compose — serviços, volumes, redes |
| 13 | [13-decisoes.md](13-decisoes.md) | Conflitos, decisões e riscos desta etapa |
| 14 | [14-contexto-proxima-etapa.md](14-contexto-proxima-etapa.md) | Contexto oficial para o Prompt 5B (implementação) |

## 0.2 Stack (reafirmada, não redecidida)

NestJS · TypeScript · Prisma ORM · PostgreSQL · JWT · Passport · Swagger/
OpenAPI · Redis (preparado) · BullMQ (preparado) · S3-compatible Storage ·
Docker · Docker Compose — idêntica a
[../05-arquitetura-backend.md](../05-arquitetura-backend.md).

## 0.3 Princípio geral desta etapa

Esta pasta responde a uma pergunta que nenhuma etapa anterior respondeu em
detalhe: **como o código NestJS é organizado em disco e em módulo**, dado
tudo que já foi decidido sobre domínio, dados, UX e API. É a ponte entre
"o que o sistema faz" (etapas 1-4) e "como o código é escrito" (Prompt 5B).

## 0.4 Pendências da API resolvidas nesta etapa

Duas das quatro pendências da especificação de API são, na verdade,
decisões de **arquitetura de backend**, não de contrato HTTP — resolvidas
aqui:

| Pendência (origem: `api/22-decisoes.md`) | Resolução |
|---|---|
| Provedor de e-mail transacional (abstração, adapters, escolha inicial) | [02-modulos.md — módulo Shared](02-modulos.md) |
| Estratégia de contract testing | [11-testes.md §11.4](11-testes.md) |

As outras duas (autenticação SSE, geração/CI do OpenAPI) já foram resolvidas
diretamente em `docs/api/` (02-autenticacao.md §2.9 e 19-openapi.md
§19.8-19.9), por serem genuinamente decisões de contrato HTTP.

---

**Próximo:** [01-arquitetura.md](01-arquitetura.md)
