ALTER TABLE "publicacoes_judiciais_capturadas" ADD COLUMN "movimento_relacionado_id" UUID;

CREATE TABLE "publicacao_estado_usuario" (
  "publicacao_id" UUID NOT NULL,
  "membro_id" UUID NOT NULL,
  "lida_em" TIMESTAMPTZ,
  "favorita_em" TIMESTAMPTZ,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "publicacao_estado_usuario_pkey" PRIMARY KEY ("publicacao_id", "membro_id")
);

CREATE INDEX "idx_publicacao_movimento" ON "publicacoes_judiciais_capturadas"("escritorio_id", "movimento_relacionado_id");
CREATE INDEX "idx_publicacao_estado_lida" ON "publicacao_estado_usuario"("membro_id", "lida_em");
CREATE INDEX "idx_publicacao_estado_favorita" ON "publicacao_estado_usuario"("membro_id", "favorita_em");

ALTER TABLE "publicacoes_judiciais_capturadas" ADD CONSTRAINT "publicacoes_movimento_relacionado_id_fkey" FOREIGN KEY ("movimento_relacionado_id") REFERENCES "movimentos_judiciais_capturados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publicacao_estado_usuario" ADD CONSTRAINT "publicacao_estado_publicacao_id_fkey" FOREIGN KEY ("publicacao_id") REFERENCES "publicacoes_judiciais_capturadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicacao_estado_usuario" ADD CONSTRAINT "publicacao_estado_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publicacao_estado_usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "publicacao_estado_usuario" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON "publicacao_estado_usuario" FOR ALL USING (
  EXISTS (SELECT 1 FROM "publicacoes_judiciais_capturadas" p WHERE p.id = publicacao_id AND p.escritorio_id = current_setting('app.tenant_id', true)::uuid)
) WITH CHECK (
  EXISTS (SELECT 1 FROM "publicacoes_judiciais_capturadas" p WHERE p.id = publicacao_id AND p.escritorio_id = current_setting('app.tenant_id', true)::uuid)
);
