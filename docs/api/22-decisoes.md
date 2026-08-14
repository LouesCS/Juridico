# 22 — Decisões, Conflitos e Riscos desta Etapa

## 22.1 Conflitos identificados

**Nenhum conflito com arquitetura, banco de dados ou permissões foi
encontrado.** Esta etapa é, como as anteriores, aditiva: formaliza em nível
de contrato HTTP decisões já tomadas em
[../05-arquitetura-backend.md](../05-arquitetura-backend.md),
[../database/](../database/00-resumo-modelagem.md) e
[../ux/](../ux/00-resumo.md). As únicas "novidades" são resoluções de
pendências deixadas explicitamente em aberto pela etapa de UX (ver §22.2),
que por definição não são conflitos — são lacunas de contrato aguardando
preenchimento.

## 22.2 Pendências da UX resolvidas nesta etapa

| Pendência (origem: `ux/20-contexto-proxima-etapa.md`) | Resolução |
|---|---|
| Contrato de streaming SSE para resumo de IA | [14-ai.md §14.3](14-ai.md) — eventos `token`/`source`/`done`/`error` |
| Contrato de tempo real para notificações | [13-notifications.md §13.5](13-notifications.md) — SSE com `heartbeat` |
| Payload de busca global agrupado por tipo | [15-search.md §15.1](15-search.md) |
| Metas de tempo de resposta como contrato de API | [20-performance.md §20.1](20-performance.md) |
| Endpoint de troca de escritório ativo | [04-identity.md §4.7](04-identity.md) |
| Endpoint de marcar notificação em lote | [13-notifications.md §13.4](13-notifications.md) |
| Endpoints de mover documento entre pastas / reordenar pastas | [10-documents.md §10.6-10.7](10-documents.md) |

## 22.3 Decisões desta etapa sem correspondente explícito anterior

| Decisão | Racional |
|---|---|
| JSON em camelCase (não snake_case) no contrato HTTP | Espelha diretamente o tipo TypeScript do frontend; tradução snake↔camel fica inteiramente na camada de mapeamento do backend, nunca no contrato |
| Nomes de recurso em inglês na URL (`/legal-cases`), valores de domínio em português (`ATIVO`, `numeroCnj`) | Recurso segue os módulos de domínio já nomeados em inglês na arquitetura backend; conceito jurídico brasileiro não se beneficia de tradução |
| Sem endpoint de batch update genérico na Fase 1 | Volume de seleção em lote é baixo; endpoint de lote introduziria complexidade de resposta parcial desproporcional — reavaliar por telemetria |
| Histórico de termos de busca mantido só no cliente (`localStorage`), sem endpoint de leitura | É preferência de UX de baixo risco, sem necessidade de sincronizar entre dispositivos nesta fase |
| `POST /v1/audit/export` documentado como contrato reservado, não implementado | A tela administrativa já promete "exportação CSV"; reservar a forma evita retrabalho de contrato quando for implementado |
| Streaming de IA reconectável (retorna `done` imediato se já concluído) | Cobre o caso de o usuário atualizar a página no meio da geração, sem perder o resultado |

## 22.4 Riscos desta etapa

| Risco | Mitigação |
|---|---|
| `EventSource` nativo do navegador não envia headers customizados (`Authorization`) | Documentado em [13-notifications.md §13.5](13-notifications.md) — usar cookie httpOnly no contexto autenticado do Next.js, ou polyfill com header no client-side puro; decisão final de implementação cabe ao Prompt 5 |
| Geração de OpenAPI automática pode divergir do contrato descrito aqui se o time não disciplinar o processo | Regra explícita em [19-openapi.md §19.1](19-openapi.md): divergência é tratada como bug de implementação em revisão de PR |
| Ausência de endpoint de batch pode gerar N chamadas simultâneas em seleção múltipla grande | Aceito conscientemente para a Fase 1; rate limit por usuário (300 req/min) comporta o volume esperado; reavaliar se necessário |
| `score` de busca e IA não exibido ao usuário pode gerar percepção de "caixa-preta" se o time de produto quiser expor no futuro | Documentado como decisão deliberada, não omissão — reversível sem quebra de contrato (campo já existe no DTO, apenas não renderizado) |

## 22.5 Pendências — status

1. ~~Mecanismo exato de autenticação do `EventSource`~~ **Resolvido:**
   cookie `httpOnly`, sem polyfill — ver
   [02-autenticacao.md §2.9](02-autenticacao.md).
2. ~~Geração automática do OpenAPI a partir de `@nestjs/swagger` + Zod~~
   **Resolvido:** Zod como fonte única (validação + tipo + schema OpenAPI),
   com três gates de CI (geração, diff de contrato, contract testing) — ver
   [19-openapi.md §19.8-19.9](19-openapi.md).
3. **Provedor de e-mail transacional** — resolvido como abstração
   independente de fornecedor (port/adapter) na arquitetura de backend, por
   ser decisão de infraestrutura de módulo, não de contrato HTTP — ver
   [../backend/02-modulos.md — módulo Shared](../backend/02-modulos.md).
4. ~~Estratégia de contract testing~~ **Resolvido:** detalhada em
   [../backend/11-testes.md](../backend/11-testes.md), referenciada a partir
   de [19-openapi.md §19.9](19-openapi.md).

---

**Anterior:** [21-seguranca.md](21-seguranca.md) · **Próximo:** [23-contexto-proxima-etapa.md](23-contexto-proxima-etapa.md)
