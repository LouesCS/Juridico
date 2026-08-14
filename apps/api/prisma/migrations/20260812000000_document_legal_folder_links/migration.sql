CREATE TYPE "TipoVinculoDocumento" AS ENUM ('PASTA_JURIDICA');

CREATE TABLE "documento_vinculo" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "tipo_recurso" "TipoVinculoDocumento" NOT NULL,
    "recurso_id" UUID NOT NULL,
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documento_vinculo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_documento_vinculo_recurso"
ON "documento_vinculo"("documento_id", "tipo_recurso", "recurso_id");

CREATE INDEX "idx_documento_vinculo_contexto"
ON "documento_vinculo"("escritorio_id", "tipo_recurso", "recurso_id", "criado_em");

ALTER TABLE "documento_vinculo"
ADD CONSTRAINT "documento_vinculo_documento_id_fkey"
FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_vinculo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_documento_vinculo ON "documento_vinculo"
USING ("escritorio_id" = current_setting('app.current_escritorio_id', true)::uuid)
WITH CHECK ("escritorio_id" = current_setting('app.current_escritorio_id', true)::uuid);
