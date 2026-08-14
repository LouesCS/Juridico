ALTER TABLE "movimentacoes_extrajudiciais"
  ADD COLUMN "excluido_em" TIMESTAMPTZ;

CREATE INDEX "idx_mov_ext_ativos"
  ON "movimentacoes_extrajudiciais"("escritorio_id", "excluido_em");

ALTER TYPE "EscopoEventoTimeline" ADD VALUE IF NOT EXISTS 'PASTA_JURIDICA';

ALTER TABLE "eventos_timeline"
  ADD COLUMN "pasta_juridica_id" UUID;

ALTER TABLE "eventos_timeline"
  ADD CONSTRAINT "eventos_timeline_pasta_juridica_id_fkey"
  FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_timeline_pasta_juridica_data"
  ON "eventos_timeline"("pasta_juridica_id", "data_evento" DESC);
