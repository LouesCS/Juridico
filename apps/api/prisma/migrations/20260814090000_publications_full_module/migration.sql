ALTER TABLE "publicacoes_judiciais_capturadas"
  ADD COLUMN "pasta_juridica_id" UUID,
  ADD COLUMN "configuracao_captura_id" UUID,
  ADD COLUMN "diario" TEXT,
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "orgao" TEXT,
  ADD COLUMN "vara" TEXT,
  ADD COLUMN "nome_vinculo" TEXT,
  ADD COLUMN "oculta" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "publicacoes_judiciais_capturadas"
  ADD CONSTRAINT "publicacoes_pasta_juridica_id_fkey"
  FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "publicacoes_judiciais_capturadas"
  ADD CONSTRAINT "publicacoes_configuracao_captura_id_fkey"
  FOREIGN KEY ("configuracao_captura_id") REFERENCES "configuracoes_captura"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_publicacao_pasta"
  ON "publicacoes_judiciais_capturadas"("escritorio_id", "pasta_juridica_id");

CREATE INDEX "idx_publicacao_configuracao_captura"
  ON "publicacoes_judiciais_capturadas"("escritorio_id", "configuracao_captura_id");

CREATE INDEX "idx_publicacao_visibilidade_data"
  ON "publicacoes_judiciais_capturadas"("escritorio_id", "oculta", "data_publicacao" DESC);
