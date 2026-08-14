ALTER TABLE "processos"
  ADD COLUMN "instituicao" TEXT,
  ADD COLUMN "numero_beneficio" TEXT;

ALTER TABLE "partes_processo"
  ADD COLUMN "principal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "idx_partes_processo_principal"
  ON "partes_processo"("processo_id", "tipo", "principal");

CREATE UNIQUE INDEX "uq_partes_processo_principal_autor_reu"
  ON "partes_processo"("processo_id", "tipo")
  WHERE "principal" = true
    AND "excluido_em" IS NULL
    AND "tipo" IN ('AUTOR', 'REU');

-- Registros legados permanecem sem principal. A escolha exige ação explícita
-- na próxima edição, evitando eleger silenciosamente a primeira parte.
