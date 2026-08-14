# 01 — Convenções Gerais da API

---

## 1.1 Versão e prefixo

- Base URL: `https://api.quilombodev.com.br/api/v1`
- Versionamento **por URL** (`/api/v1`, `/api/v2`...) — nunca por header
  (`Accept-Version`) nem por query param. URL versioning é explícito,
  cacheável e depurável em log de acesso sem inspecionar headers.
- **Versionamento futuro:** uma nova versão major (`/v2`) só é criada quando
  uma mudança quebra compatibilidade (remoção de campo, mudança de tipo,
  mudança de significado). Versões coexistem por no mínimo 6 meses de
  depreciação anunciada (header `Deprecation` + `Sunset`, RFC 8594).
  Adição de campo opcional, novo endpoint ou novo valor de enum **não** exige
  nova versão.

## 1.2 Formato

- `Content-Type: application/json; charset=utf-8` em toda request/response
  com corpo.
- Upload de arquivo é exceção: `multipart/form-data` apenas para o passo de
  confirmação de metadado quando aplicável — o binário em si nunca trafega
  pela API (ver [10-documents.md §10.1](10-documents.md)).
- Chaves JSON em **camelCase** (espelha o tipo TypeScript do frontend,
  gerado do mesmo contrato — reafirma
  [../04-arquitetura-frontend.md §4.1](../04-arquitetura-frontend.md)). O
  banco usa `snake_case` internamente ([../database/02-convencoes-dados.md §2.1](../database/02-convencoes-dados.md))
  — a tradução acontece inteiramente na camada de mapeamento do backend,
  nunca vaza para o contrato.

## 1.3 Timezone

Toda data/hora em **ISO 8601 UTC** (`2026-08-12T14:30:00.000Z`), reafirma
[../database/02-convencoes-dados.md §2.14](../database/02-convencoes-dados.md).
Conversão para o fuso do usuário acontece exclusivamente no cliente. Campos de
data pura (sem hora, ex.: `dataDistribuicao`) usam `YYYY-MM-DD`, nunca
timestamp completo — evita ambiguidade de fuso deslocando o dia.

## 1.4 Paginação

**Cursor (keyset), nunca offset**, em toda listagem de volume — reafirma
[../database/02-convencoes-dados.md §2.15](../database/02-convencoes-dados.md).

**Request:**
```
GET /v1/legal-cases?cursor=eyJ2IjoiMjAyNi0wOC0xMiIsImlkIjoiLi4uIn0&limit=25
```
**Response:**
```json
{
  "data": [ /* itens */ ],
  "pagination": {
    "nextCursor": "eyJ2IjoiMjAyNi0wOC0xMCIsImlkIjoiLi4uIn0",
    "hasMore": true
  }
}
```
- `cursor` é uma string opaca Base64 (nunca o `id` cru) — codifica
  `(valorDeOrdenacao, id)`, reafirma
  [../database/02-convencoes-dados.md §2.15](../database/02-convencoes-dados.md).
- `limit`: padrão 25, máximo 100. Acima de 100, a API retorna 422.
- Exceção explícita: telas administrativas de baixo volume (papéis
  customizados, lista de permissões) usam `page`/`pageSize` simples — nunca
  para Processos, Documentos, Timeline, Auditoria, Notificações.

## 1.5 Ordenação

Query param `sort`, formato `campo` (ascendente) ou `-campo` (descendente).
Múltiplos critérios separados por vírgula: `sort=-atualizadoEm,titulo`. Cada
recurso documenta seus campos ordenáveis (sempre um subconjunto pequeno,
correspondente a índice existente — reafirma
[../database/09-indices-busca-performance.md](../database/09-indices-busca-performance.md);
ordenar por campo sem índice não é oferecido). Ordenação padrão por recurso
documentada em cada arquivo de endpoint.

## 1.6 Filtros

Query params nomeados diretamente pelo campo (`status=ATIVO`,
`responsavelId=<uuid>`), com operadores compostos por sufixo quando
necessário: `dataVencimento[gte]=2026-08-01`, `dataVencimento[lte]=2026-08-31`.
Filtro de texto livre dentro de uma lista (busca local à tela, distinta da
Busca Global) usa `q=` — reafirma distinção de
[../ux/09-busca-global.md §9.10](../ux/09-busca-global.md) entre busca de
página e busca global.

## 1.7 Busca

Busca Global é endpoint próprio (`GET /v1/search`, ver
[15-search.md](15-search.md)), nunca um filtro `q=` genérico dentro de um
recurso — a Busca Global cruza múltiplos tipos de entidade e aplica ranking
híbrido, o que um filtro de lista não faz.

## 1.8 Convenção de nomes

| Elemento | Convenção | Exemplo |
|---|---|---|
| Recurso na URL | kebab-case, plural, inglês | `/legal-cases`, `/documents` |
| Campo JSON | camelCase | `numeroCnj`, `criadoEm` |
| Query param | camelCase | `responsavelId`, `dataVencimento[gte]` |
| Enum (valor) | UPPER_SNAKE_CASE | `ATIVO`, `SEGUNDA_INSTANCIA` |
| Header customizado | `X-PascalKebab-Case` | `X-Correlation-Id` |

Nomes de recurso na URL em inglês (espelham os módulos de domínio de
[../database/00-resumo-modelagem.md §0.4](../database/00-resumo-modelagem.md):
`legal-cases`, não `processos`) — valores de campo e enums que representam
conceito do domínio jurídico brasileiro permanecem em português
(`numeroCnj`, `segredoJustica`, status como `ATIVO`), pois traduzir esses
termos criaria uma camada de tradução mental desnecessária para o time
brasileiro que consome a API.

## 1.9 Tratamento de erros

Estrutura única RFC 9457 (Problem Details) em toda resposta de erro — detalhe
completo em [17-errors.md](17-errors.md).

## 1.10 CorrelationId e RequestId

| Header | Escopo | Gerado por |
|---|---|---|
| `X-Request-Id` | Uma única requisição HTTP | Backend, se o cliente não enviar |
| `X-Correlation-Id` | Toda a cadeia de uma operação de negócio (request → job assíncrono → evento → notificação) | Cliente (frontend) na origem, propagado por toda a cadeia |

`X-Correlation-Id` é o que aparece em mensagem de erro ao usuário (reafirma
[../ux/14-ux-writing.md §14.2](../ux/14-ux-writing.md)) e em
`LogAuditoria.correlationId` ([../database/06-entidades-ia-notificacoes-auditoria.md](../database/06-entidades-ia-notificacoes-auditoria.md)) —
é o identificador que conecta "o que o usuário viu" a "o que aconteceu no
backend/banco/fila". `X-Request-Id` é mais granular, útil para depuração de
uma chamada HTTP isolada (ex.: retry).

## 1.11 Idempotência

Header `Idempotency-Key` (UUID gerado pelo cliente) obrigatório em todo `POST`
que cria recurso com efeito colateral relevante (criar processo, criar
documento, solicitar resumo de IA, convidar membro). Reenvio da mesma chave
dentro de 24h retorna a resposta original (200/201 idempotente), sem
duplicar o efeito — reafirma
[../database/12-eventos-fluxos-regras.md §12.2](../database/12-eventos-fluxos-regras.md).
`PATCH`/`PUT` são naturalmente idempotentes por semântica HTTP e não exigem o
header.

## 1.12 Rate Limit

| Escopo | Limite padrão | Header de resposta |
|---|---|---|
| Por tenant (escritório) | 1000 req/min | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Por usuário | 300 req/min | Idem |
| Por IP (endpoints públicos: login, recuperação de senha) | 20 req/min | Idem |

Exceder o limite → `429 Too Many Requests` com `Retry-After`. Endpoint de
geração de IA tem limite adicional por cota de negócio (ver
[14-ai.md §14.6](14-ai.md)), distinto do rate limit técnico.

## 1.13 Cache

`ETag` (hash do corpo da resposta) em todo `GET` de recurso individual
(`/legal-cases/:id`, `/documents/:id`). Cliente envia `If-None-Match`;
servidor responde `304 Not Modified` sem corpo quando o `ETag` confere.
Listagens não usam `ETag` (mudam com frequência e por múltiplos fatores) —
usam apenas o `Cache-Control: no-store` padrão de dado transacional.

## 1.14 Compressão

`Content-Encoding: gzip` (ou `br` quando o cliente aceita, via
`Accept-Encoding`) em toda resposta acima de 1 KB — aplicado pelo proxy
reverso/load balancer, transparente à aplicação.

## 1.15 CORS

Origem permitida: exclusivamente o(s) domínio(s) do frontend oficial
(`app.quilombodev.com.br` e ambientes de homologação conhecidos) —
`Access-Control-Allow-Origin` nunca `*` em rota autenticada.
`Access-Control-Allow-Credentials: true` (necessário para cookie httpOnly de
refresh token). Métodos e headers permitidos declarados explicitamente, sem
wildcard.

## 1.16 Headers padrão

| Header | Direção | Obrigatório | Descrição |
|---|---|---|---|
| `Authorization: Bearer <token>` | Request | Sim (exceto rotas públicas) | Access token JWT |
| `X-Tenant-Id` | — | **Nunca enviado pelo cliente** | Tenant vem exclusivamente da claim do JWT — reafirma [../database/01-estrategia-multitenancy.md §1.2](../database/01-estrategia-multitenancy.md); um header de tenant controlável pelo cliente seria vetor de IDOR |
| `X-Correlation-Id` | Request/Response | Recomendado | Ver §1.10 |
| `Idempotency-Key` | Request | Condicional | Ver §1.11 |
| `If-None-Match` / `ETag` | Request/Response | Opcional | Ver §1.13 |
| `X-RateLimit-*` | Response | Sempre | Ver §1.12 |
| `Deprecation` / `Sunset` | Response | Em rota depreciada | Ver §1.1 |

---

**Anterior:** [00-resumo.md](00-resumo.md) · **Próximo:** [02-autenticacao.md](02-autenticacao.md)
