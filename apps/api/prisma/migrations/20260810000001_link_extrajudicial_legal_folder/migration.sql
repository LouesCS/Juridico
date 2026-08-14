ALTER TABLE "movimentacoes_extrajudiciais"
ADD COLUMN "pasta_juridica_id" UUID;

ALTER TABLE "movimentacoes_extrajudiciais"
ADD CONSTRAINT "movimentacoes_extrajudiciais_pasta_juridica_id_fkey"
FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_mov_ext_pasta_juridica"
ON "movimentacoes_extrajudiciais"("escritorio_id", "pasta_juridica_id", "data_movimentacao" DESC);
