ALTER TABLE "movimento_estado_usuario"
  ADD COLUMN "lida_em" TIMESTAMPTZ;

CREATE INDEX "idx_movimento_estado_leitura"
  ON "movimento_estado_usuario"("membro_id", "lida_em");

ALTER TYPE "TipoVinculoTarefa" ADD VALUE IF NOT EXISTS 'MOVIMENTACAO_JUDICIAL';
