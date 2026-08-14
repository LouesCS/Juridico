ALTER TABLE "movimentacao_extrajudicial_estado_usuario"
ADD COLUMN "lida_em" TIMESTAMPTZ;

CREATE INDEX "idx_mov_ext_estado_leitura"
ON "movimentacao_extrajudicial_estado_usuario"("membro_id", "lida_em");

ALTER TYPE "TipoVinculoTarefa" ADD VALUE IF NOT EXISTS 'MOVIMENTACAO_EXTRAJUDICIAL';
