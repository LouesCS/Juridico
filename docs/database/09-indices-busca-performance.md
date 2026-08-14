# 09 — Índices, Busca Global e Performance

---

## 9.1 Índices por caso de uso

| Caso de uso | Índice | Tipo |
|---|---|---|
| Login por e-mail | `uq_usuarios_email` | B-tree único parcial (`WHERE excluido_em IS NULL`) |
| Slug do escritório | `uq_escritorios_slug` | B-tree único |
| Usuários (membros) por escritório | `idx_membros_escritorio_status` | B-tree composto |
| Clientes por nome | `idx_clientes_escritorio_nome (escritorio_id, nome)` | B-tree composto + trigram (ver §9.3) |
| CPF e CNPJ | `idx_clientes_escritorio_documento` / `_cnpj` | B-tree composto |
| Processos por número CNJ | `idx_processos_cnj_digitos` | B-tree + trigram sobre a coluna gerada `numero_cnj_somente_digitos` |
| Processos por número interno | `idx_processos_escritorio_numero_interno` | B-tree composto |
| Processos por responsável | `idx_processos_escritorio_responsavel` | B-tree composto |
| Processos por status | `idx_processos_escritorio_status` | B-tree composto |
| Processos por próxima data relevante | `idx_processos_escritorio_proxima_data` | B-tree composto parcial (`WHERE excluido_em IS NULL`) |
| Timeline por processo e data | `idx_timeline_processo_data (processo_id, data_evento DESC)` | B-tree composto |
| Documentos por processo | `idx_documentos_escritorio_processo` | B-tree composto |
| Documentos por pasta | `idx_documentos_pasta` | B-tree |
| Busca por nome (global) | Ver §9.3 | GIN (FTS) + GIN (trigram) |
| Notificações não lidas | `idx_notificacoes_destinatario_nao_lida` | B-tree composto parcial |
| Resumos de IA por processo | `idx_resumos_ia_processo_tipo_vigente` | B-tree composto parcial |
| Auditoria por entidade e período | `idx_auditoria_recurso` / `idx_auditoria_escritorio_periodo` | B-tree composto |
| Registros ativos com soft delete | Todo índice de listagem inclui `WHERE excluido_em IS NULL` | Parcial |

## 9.2 Índices compostos, parciais e únicos

- **Compostos:** sempre com `escritorio_id` como primeira coluna quando o filtro
  de tenant é obrigatório em toda query (reafirma §1 de
  [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md)) — isso faz o
  otimizador do Postgres escolher o índice de tenant antes de qualquer outro
  filtro, o que é sempre o padrão de acesso real do produto.
- **Parciais** (`WHERE excluido_em IS NULL`, `WHERE status <> 'CONCLUIDO'`):
  reduzem o índice ao subconjunto realmente consultado no dia a dia — um
  processo arquivado há 3 anos não deveria pesar no índice de "processos
  ativos por responsável".
- **Únicos:** sempre parciais quando soft delete está envolvido
  (`WHERE excluido_em IS NULL`) — permite que um CPF "reapareça" livremente
  após o registro original ser excluído, sem violar a constraint.

**Risco de excesso de índices:** cada índice adicional é custo de escrita
(todo `INSERT`/`UPDATE` mantém todos os índices da tabela) e espaço em disco.
Regra prática adotada: nenhum índice é criado especulativamente — todo índice
deste documento existe porque sustenta uma query específica já especificada em
[../08-especificacao-modulos.md](../08-especificacao-modulos.md) ou nesta pasta.
Revisão trimestral via `pg_stat_user_indexes` remove índices não utilizados.

## 9.3 Busca global — estratégia

Escopo do MVP: Processos, Clientes, Documentos (título + conteúdo extraído),
Tags, Comentários.

| Abordagem | Prós | Contras |
|---|---|---|
| `ILIKE '%termo%'` | Trivial de implementar | Sem índice eficiente (scan completo), sem relevância, sem tolerância a erro de digitação, degrada linearmente com volume |
| **Full-text search (FTS) nativo** | Indexável (GIN), suporta relevância (`ts_rank`), suporta português (`to_tsvector('portuguese', ...)`), sem infraestrutura extra | Não tolera erro de digitação isoladamente; exige coluna `tsvector` mantida |
| **Trigram (`pg_trgm`)** | Tolerante a erro de digitação e busca parcial (`%termo%` com índice `GIN gin_trgm_ops`) | Menos preciso em relevância que FTS puro |
| Motor externo (OpenSearch/Elastic) | Melhor relevância e escala em volume muito alto, facetas ricas | Mais uma infraestrutura para operar, consistência eventual com o banco principal, custo desproporcional ao volume da Fase 1 |

**Escolha para o MVP: FTS + trigram combinados no PostgreSQL** — reafirma
[../05-arquitetura-backend.md §5.9](../05-arquitetura-backend.md). FTS resolve
relevância e idioma; trigram cobre o caso de erro de digitação/busca parcial
que FTS sozinho não cobre bem (ex.: "prcesso" → "processo").

**Escolha para escala futura:** OpenSearch (ou serviço gerenciado equivalente)
quando o volume ultrapassar o gatilho já registrado em
[../10-roadmap-e-decisoes.md §10.5](../10-roadmap-e-decisoes.md) (>5M
documentos por tenant ou p95 >400ms) — migração de leitura, não de escrita: o
Postgres continua sendo a fonte de verdade, o motor externo é apenas índice
derivado.

### 9.3.1 Implementação FTS (conceitual)

```sql
ALTER TABLE processos ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(numero_cnj,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(descricao,'')), 'B')
  ) STORED;

CREATE INDEX idx_processos_busca_tsv ON processos USING GIN (busca_tsv);
```
Padrão repetido (com pesos ajustados) em `clientes.nome/razao_social`,
`documentos.nome/nome_original` (+ `texto_extraido` quando `statusProcessamento
= PRONTO`), `tags.nome`.

### 9.3.2 Normalização, acentos e erros de digitação

- `to_tsvector('portuguese', ...)` já normaliza plural/singular e remove
  *stopwords* do português.
- Acentos: configuração de dicionário `unaccent` combinada ao `tsvector`
  (`to_tsvector('portuguese', unaccent(texto))`) para que "processo" encontre
  "prócesso" e vice-versa.
- Erros de digitação: cobertos pelo índice trigram paralelo — a busca dispara
  as duas estratégias e funde os resultados (Reciprocal Rank Fusion, mesmo
  mecanismo já descrito em [../05-arquitetura-backend.md §5.9](../05-arquitetura-backend.md)).

### 9.3.3 Relevância, filtros e segurança

- `ts_rank_cd(busca_tsv, query)` para ordenar por relevância textual; empates
  desempatados por `atualizado_em DESC`.
- **Filtro de permissão aplicado na própria query SQL**, nunca pós-processado
  em memória — a mesma extensão de tenant (§1.4 em [01](01-estrategia-multitenancy.md))
  se aplica à query de busca como a qualquer outra; segredo de justiça e
  confidencialidade entram como predicado adicional no `WHERE`, resolvido pela
  mesma função de autorização usada na leitura direta do recurso (nenhuma
  lógica duplicada entre "ler processo" e "buscar processo").
- **Paginação:** cursor sobre `(rank, id)` — mesmo padrão de
  [02-convencoes-dados.md §2.15](02-convencoes-dados.md).
- **Destaque do termo:** `ts_headline('portuguese', texto, query)` gera o
  snippet com o termo em evidência, calculado sob demanda apenas para os itens
  da página atual (nunca para o conjunto completo de resultados).

### 9.3.4 Atualização do índice

Colunas `GENERATED ALWAYS ... STORED` atualizam o `tsvector` automaticamente em
todo `INSERT`/`UPDATE` da linha — sem job de reindexação para metadados. Para
`texto_extraido` de documento (que chega de forma assíncrona após OCR/extração),
o `UPDATE` que grava o texto extraído já dispara a regeneração da coluna
gerada correspondente — não há janela em que o documento fique
"processado mas não buscável" além do tempo do próprio `UPDATE`.

### 9.3.5 Busca em conteúdo de documento (presente) e busca semântica (futuro)

`texto_extraido` (ver [05](05-entidades-documentos-colaboracao.md) §5.3) entra
no mesmo `tsvector` de `documentos`, com peso menor que `nome` — busca no
conteúdo do PDF já funciona no MVP via FTS. Busca semântica (embeddings +
`pgvector`, HNSW) é a evolução já especificada em
[../05-arquitetura-backend.md §5.9-5.10](../05-arquitetura-backend.md) e
modelada conceitualmente em `Embedding`/`IndiceBusca`
([../06-modelo-dominio.md §6.6](../06-modelo-dominio.md)) — não implementada
como índice físico nesta etapa de modelagem, apenas preparada.

## 9.4 Paginação por cursor (detalhe de índice)

Cursor codifica `(valorOrdenacao, id)`. O índice que sustenta a paginação é
sempre o mesmo composto usado no filtro da listagem, com a coluna de
ordenação como sufixo — ex.: `idx_processos_escritorio_atualizacao
(escritorio_id, atualizado_em DESC, id)` cobre filtro + ordenação + desempate
em uma única leitura de índice, sem *sort* adicional em memória.

## 9.5 Consultas N+1

Prevenção arquitetural (detalhado em
[11-prisma-migracoes-seed.md](11-prisma-migracoes-seed.md) §11.9):
`include`/`select` explícitos por caso de uso (nunca serialização "solta" que
força carregamento tardio) · `DataLoader`-like batching para os poucos casos de
grafo profundo (ex.: montar contexto de IA que atravessa
Processo→Documentos→Versões) · teste de contagem de queries por endpoint no CI
(um endpoint de listagem que deveria fazer 2 queries e passa a fazer N é
regressão de performance, testada como tal).

## 9.6 Arquivamento de dados históricos

- `eventos_timeline` e `log_auditoria` são os dois maiores candidatos a volume
  de longo prazo. `log_auditoria` já nasce particionada por mês (§6.6 em
  [06](06-entidades-ia-notificacoes-auditoria.md)); partições com mais de 12
  meses são movidas para armazenamento "frio" (tablespace mais barato ou
  exportação para storage de objeto em formato Parquet) mantendo apenas
  metadado de localização na partição ativa.
- `eventos_timeline` não particiona no MVP (volume por processo é finito e
  pequeno; o que cresce é o número de processos, já bem servido pelo índice
  composto por `processo_id`) — particionamento por `criado_em` é o gatilho de
  evolução já registrado em [05](05-entidades-documentos-colaboracao.md) §5.1,
  acionado por volume total da tabela, não por volume por processo.

---

**Anterior:** [08-permissoes-seguranca.md](08-permissoes-seguranca.md) · **Próximo:** [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md)
