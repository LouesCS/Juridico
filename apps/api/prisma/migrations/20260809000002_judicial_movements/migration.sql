CREATE TABLE "movimento_estado_usuario" (
  "movimento_id" UUID NOT NULL,
  "membro_id" UUID NOT NULL,
  "favorita_em" TIMESTAMPTZ,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "movimento_estado_usuario_pkey" PRIMARY KEY ("movimento_id", "membro_id"),
  CONSTRAINT "movimento_estado_usuario_movimento_id_fkey" FOREIGN KEY ("movimento_id") REFERENCES "movimentos_judiciais_capturados"("id") ON DELETE CASCADE,
  CONSTRAINT "movimento_estado_usuario_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_movimento_estado_favorita" ON "movimento_estado_usuario"("membro_id", "favorita_em");

ALTER TABLE "movimento_estado_usuario" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimento_estado_usuario_tenant_isolation" ON "movimento_estado_usuario"
USING (EXISTS (
  SELECT 1 FROM "movimentos_judiciais_capturados" movimento
  WHERE movimento."id" = "movimento_estado_usuario"."movimento_id"
    AND movimento."escritorio_id" = current_setting('app.tenant_id', true)::uuid
));
