ALTER TYPE "EntidadeConfiguravel" ADD VALUE IF NOT EXISTS 'MOVIMENTACAO_EXTRAJUDICIAL';

CREATE TABLE "movimentacoes_extrajudiciais" (
  "id" UUID NOT NULL, "escritorio_id" UUID NOT NULL, "cliente_id" UUID NOT NULL,
  "processo_id" UUID, "pasta_id" UUID, "responsavel_id" UUID NOT NULL,
  "data_movimentacao" TIMESTAMPTZ NOT NULL, "tipo" TEXT NOT NULL, "origem" TEXT NOT NULL,
  "status" TEXT NOT NULL, "descricao" TEXT NOT NULL, "observacoes" TEXT,
  "campos_extras_valores" JSONB NOT NULL DEFAULT '{}', "criado_por_id" UUID NOT NULL,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "movimentacoes_extrajudiciais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mov_ext_escritorio_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE,
  CONSTRAINT "mov_ext_cliente_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT,
  CONSTRAINT "mov_ext_processo_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL,
  CONSTRAINT "mov_ext_pasta_fkey" FOREIGN KEY ("pasta_id") REFERENCES "pastas"("id") ON DELETE SET NULL,
  CONSTRAINT "mov_ext_responsavel_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "membros"("id") ON DELETE RESTRICT
);
CREATE INDEX "idx_mov_ext_data" ON "movimentacoes_extrajudiciais"("escritorio_id", "data_movimentacao" DESC);
CREATE INDEX "idx_mov_ext_cliente" ON "movimentacoes_extrajudiciais"("escritorio_id", "cliente_id");
CREATE INDEX "idx_mov_ext_processo" ON "movimentacoes_extrajudiciais"("escritorio_id", "processo_id");

CREATE TABLE "movimentacao_extrajudicial_estado_usuario" (
  "movimentacao_id" UUID NOT NULL, "membro_id" UUID NOT NULL, "favorita_em" TIMESTAMPTZ,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "movimentacao_extrajudicial_estado_usuario_pkey" PRIMARY KEY ("movimentacao_id", "membro_id"),
  CONSTRAINT "mov_ext_estado_mov_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes_extrajudiciais"("id") ON DELETE CASCADE,
  CONSTRAINT "mov_ext_estado_membro_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_mov_ext_estado_favorita" ON "movimentacao_extrajudicial_estado_usuario"("membro_id", "favorita_em");

ALTER TABLE "movimentacoes_extrajudiciais" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_ext_tenant_isolation" ON "movimentacoes_extrajudiciais" USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
ALTER TABLE "movimentacao_extrajudicial_estado_usuario" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_ext_estado_tenant_isolation" ON "movimentacao_extrajudicial_estado_usuario" USING (EXISTS (SELECT 1 FROM "movimentacoes_extrajudiciais" m WHERE m."id" = "movimentacao_extrajudicial_estado_usuario"."movimentacao_id" AND m."escritorio_id" = current_setting('app.tenant_id', true)::uuid));
