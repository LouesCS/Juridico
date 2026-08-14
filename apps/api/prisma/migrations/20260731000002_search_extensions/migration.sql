-- ============================================================================
-- Extensões, Full-Text Search e Trigram — PROMPT 5C Etapa 3.
-- Reafirma docs/database/09-indices-busca-performance.md §9.3
-- ("FTS + trigram combinados no PostgreSQL"). NUNCA EXECUTADA contra
-- Postgres real neste ambiente — ver docs/backend-implementation/02-database.md.
--
-- NOTA DE DIVERGÊNCIA (registrada, não corrigida silenciosamente): §9.3 do
-- documento de modelagem descreve `documentos.texto_extraido` como parte do
-- tsvector de busca, mas essa coluna não existe em `schema.prisma` (o campo
-- de texto extraído por OCR/parsing nunca foi modelado como coluna própria
-- na Fase 1 implementada). O tsvector de `documentos` abaixo cobre apenas
-- `nome`/`nome_original` — quando `texto_extraido` for adicionado ao schema,
-- esta migration precisa de um ALTER incremental, não reescrita.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ----------------------------------------------------------------------------
-- Clientes — FTS (nome, razão social) + trigram (nome, tolerante a erro de
-- digitação e busca parcial, reafirma §9.3).
-- ----------------------------------------------------------------------------

ALTER TABLE clientes ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', unaccent(coalesce(nome, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(razao_social, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(nome_social, ''))), 'B')
  ) STORED;

CREATE INDEX idx_clientes_busca_tsv ON clientes USING GIN (busca_tsv);
CREATE INDEX idx_clientes_nome_trgm ON clientes USING GIN (nome gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- Processos — FTS (título, número CNJ, descrição) + trigram sobre o número
-- CNJ normalizado (só dígitos), reafirma
-- docs/database/09-indices-busca-performance.md §9.1 ("idx_processos_cnj_digitos").
-- ----------------------------------------------------------------------------

ALTER TABLE processos ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', unaccent(coalesce(titulo, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(numero_cnj, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(descricao, ''))), 'B')
  ) STORED;

CREATE INDEX idx_processos_busca_tsv ON processos USING GIN (busca_tsv);

ALTER TABLE processos ADD COLUMN numero_cnj_somente_digitos text
  GENERATED ALWAYS AS (regexp_replace(coalesce(numero_cnj, ''), '\D', '', 'g')) STORED;

CREATE INDEX idx_processos_cnj_digitos ON processos
  USING GIN (numero_cnj_somente_digitos gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- Documentos — FTS (nome, nome original). `texto_extraido` não existe no
-- schema implementado — ver nota de divergência no topo do arquivo.
-- ----------------------------------------------------------------------------

ALTER TABLE documentos ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', unaccent(coalesce(nome, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(nome_original, ''))), 'B')
  ) STORED;

CREATE INDEX idx_documentos_busca_tsv ON documentos USING GIN (busca_tsv);

-- ----------------------------------------------------------------------------
-- Tags — FTS simples (nome), sem trigram (nomes de tag são curtos e
-- controlados, ILIKE via índice B-tree padrão já é suficiente).
-- ----------------------------------------------------------------------------

ALTER TABLE tags ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', unaccent(coalesce(nome, '')))) STORED;

CREATE INDEX idx_tags_busca_tsv ON tags USING GIN (busca_tsv);

-- ----------------------------------------------------------------------------
-- Comentários — FTS simples (conteúdo), incluído no escopo de busca global
-- (docs/database/09-indices-busca-performance.md §9.3: "Escopo do MVP:
-- Processos, Clientes, Documentos, Tags, Comentários").
-- ----------------------------------------------------------------------------

ALTER TABLE comentarios ADD COLUMN busca_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', unaccent(coalesce(conteudo, '')))) STORED;

CREATE INDEX idx_comentarios_busca_tsv ON comentarios USING GIN (busca_tsv);
