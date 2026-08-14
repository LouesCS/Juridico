-- Sprint 09 (Documentos e Pastas) — favoritos são por membro, não uma coluna
-- booleana global em `documentos`/`pastas`. Migration aditiva: cria duas
-- tabelas novas, não altera nenhuma tabela existente.

CREATE TABLE "documento_favorito" (
    "documento_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "documento_favorito_pkey" PRIMARY KEY ("documento_id", "membro_id")
);

ALTER TABLE "documento_favorito"
    ADD CONSTRAINT "documento_favorito_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE;

CREATE TABLE "pasta_favorito" (
    "pasta_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "pasta_favorito_pkey" PRIMARY KEY ("pasta_id", "membro_id")
);

ALTER TABLE "pasta_favorito"
    ADD CONSTRAINT "pasta_favorito_pasta_id_fkey"
    FOREIGN KEY ("pasta_id") REFERENCES "pastas"("id") ON DELETE CASCADE;
