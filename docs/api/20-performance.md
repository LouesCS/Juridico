# 20 — Performance

> Reafirma [../05-arquitetura-backend.md §5.13](../05-arquitetura-backend.md),
> [../database/09-indices-busca-performance.md](../database/09-indices-busca-performance.md)
> e as metas de produto de [../01-visao-produto.md §1.6](../01-visao-produto.md) —
> aqui, formalizadas como **contrato de API**, não apenas meta de produto.

## 20.1 Metas de latência (contrato, gate de CI de performance)

| Endpoint/operação | Meta p95 |
|---|---|
| `GET /v1/search` | < 400 ms |
| `GET /v1/legal-cases` (listagem paginada) | < 150 ms |
| `GET /v1/legal-cases/:id` | < 100 ms |
| `POST /v1/legal-cases` | < 300 ms |
| `GET /v1/dashboard/*` (agregados) | < 200 ms por bloco |
| Primeiro evento (`token`) de `GET /v1/ai-summaries/:id/stream` | < 2 s |
| `POST /v1/documents/presign` | < 200 ms |
| Documento buscável por conteúdo após confirmação de upload | < 60 s (assíncrono) |

Regressão acima da meta em ambiente de staging **bloqueia deploy** — mesmo
gate já estabelecido para o frontend em
[../04-arquitetura-frontend.md §4.7](../04-arquitetura-frontend.md), aplicado
agora ao backend.

## 20.2 Cache

`ETag`/`If-None-Match` em `GET` de recurso individual (reafirma
[01-convencoes.md §1.13](01-convencoes.md)). Cache de aplicação (Redis) para:
agregados de Dashboard (TTL curto, invalidado por evento de domínio — nunca
por tempo apenas), resultado de `GET /v1/office/ai-usage` (TTL 5 min),
catálogo de permissões/papéis de sistema (TTL longo, raramente muda).
**Nunca** cache de dado por-usuário com escopo de segurança (resultado de
busca, detalhe de processo) além do `ETag` — risco de servir dado
desatualizado com implicação de autorização é maior que o ganho.

## 20.3 Compressão

Gzip/Brotli no proxy reverso, transparente à API (reafirma
[01-convencoes.md §1.14](01-convencoes.md)). Resposta de streaming (SSE) não
é comprimida (incompatível com o modelo de entrega incremental).

## 20.4 Paginação e Lazy Loading

Cursor em toda listagem de volume (reafirma
[01-convencoes.md §1.4](01-convencoes.md)). Frontend usa scroll infinito
(reafirma [../ux/09-busca-global.md](../ux/09-busca-global.md), timeline e
listas de processo/documento) — nunca carrega mais do que a página atual
pede.

## 20.5 Prevenção de N+1

Todo endpoint de listagem/detalhe que compõe dado de mais de uma entidade
(`ProcessoResumoDTO` inclui `cliente.nome` e `responsavel.nome`) resolve via
`include`/`select` explícito de uma única query — reafirma
[../database/11-prisma-migracoes-seed.md §11.9](../database/11-prisma-migracoes-seed.md).
Teste de contagem de queries por endpoint no CI (limite máximo declarado por
endpoint) — regressão de N+1 quebra o build, não é descoberta em produção.

## 20.6 Batch

Não há endpoint de "batch update" genérico na Fase 1 (ex.: não existe
`PATCH /v1/legal-cases/bulk`) — operações em lote da UI (ex.: seleção
múltipla em `Data Grid`, reafirma
[../ux/13-componentes.md §13.4](../ux/13-componentes.md)) são implementadas
como N chamadas ao endpoint singular em paralelo pelo frontend, não como um
endpoint de lote no backend — decisão deliberada para a Fase 1: volume de
seleção em lote é baixo (dezenas, não milhares de itens), e um endpoint de
lote introduziria complexidade de resposta parcial (o que fazer se 3 de 10
itens falharem?) desproporcional ao ganho. Reavaliar se telemetria mostrar
seleção em lote de alto volume.

## 20.7 Rate Limit

Reafirma [01-convencoes.md §1.12](01-convencoes.md) — por tenant, por
usuário, por IP, com header padrão de resposta.

## 20.8 Timeout

| Chamada | Timeout |
|---|---|
| Requisição HTTP síncrona (qualquer endpoint não-streaming) | 10 s |
| Chamada ao provedor de IA (dentro do streaming) | 60 s sem evento novo → erro |
| Chamada a storage (presign, confirm) | 5 s |
| Chamada a OAuth (Google/Microsoft) | 8 s |

Nenhuma chamada de rede tem timeout infinito — reafirma
[../05-arquitetura-backend.md §5.13](../05-arquitetura-backend.md).

---

**Anterior:** [19-openapi.md](19-openapi.md) · **Próximo:** [21-seguranca.md](21-seguranca.md)
