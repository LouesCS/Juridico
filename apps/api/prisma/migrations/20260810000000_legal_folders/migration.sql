-- Pasta Jurídica é um agregado de negócio novo. `pastas` permanece sendo
-- exclusivamente a árvore de folders do Document Engine.
ALTER TYPE "EntidadeConfiguravel" ADD VALUE IF NOT EXISTS 'PASTA_JURIDICA';
ALTER TYPE "TipoVinculoTarefa" ADD VALUE IF NOT EXISTS 'PASTA_JURIDICA';

CREATE TABLE "pastas_juridicas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "escritorio_id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "numero_interno" TEXT,
  "assunto" TEXT,
  "situacao" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  "confidencial" BOOLEAN NOT NULL DEFAULT false,
  "cliente_principal_id" UUID NOT NULL,
  "parte_contraria_principal_id" UUID,
  "encarregado_id" UUID NOT NULL,
  "observacoes" TEXT,
  "campos_extras_valores" JSONB NOT NULL DEFAULT '{}',
  "data_conclusao" DATE,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  "arquivado_em" TIMESTAMPTZ,
  "excluido_em" TIMESTAMPTZ,
  CONSTRAINT "pastas_juridicas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pasta_juridica_processos" (
  "pasta_juridica_id" UUID NOT NULL,
  "processo_id" UUID NOT NULL,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pasta_juridica_processos_pkey" PRIMARY KEY ("pasta_juridica_id", "processo_id")
);

ALTER TABLE "configuracoes_captura" ADD COLUMN "pasta_juridica_id" UUID;

CREATE UNIQUE INDEX "uq_pastas_juridicas_escritorio_numero" ON "pastas_juridicas"("escritorio_id", "numero_interno");
CREATE INDEX "idx_pastas_juridicas_escritorio_situacao" ON "pastas_juridicas"("escritorio_id", "situacao");
CREATE INDEX "idx_pastas_juridicas_cliente" ON "pastas_juridicas"("escritorio_id", "cliente_principal_id");
CREATE INDEX "idx_pastas_juridicas_encarregado" ON "pastas_juridicas"("escritorio_id", "encarregado_id");
CREATE INDEX "idx_pasta_juridica_processo_processo" ON "pasta_juridica_processos"("processo_id");
CREATE INDEX "idx_config_captura_pasta_juridica" ON "configuracoes_captura"("pasta_juridica_id");

ALTER TABLE "pastas_juridicas" ADD CONSTRAINT "pastas_juridicas_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pastas_juridicas" ADD CONSTRAINT "pastas_juridicas_cliente_principal_id_fkey" FOREIGN KEY ("cliente_principal_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pastas_juridicas" ADD CONSTRAINT "pastas_juridicas_parte_contraria_id_fkey" FOREIGN KEY ("parte_contraria_principal_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pasta_juridica_processos" ADD CONSTRAINT "pasta_juridica_processos_pasta_id_fkey" FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pasta_juridica_processos" ADD CONSTRAINT "pasta_juridica_processos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "configuracoes_captura" ADD CONSTRAINT "configuracoes_captura_pasta_juridica_id_fkey" FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pastas_juridicas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pastas_juridicas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_select ON "pastas_juridicas" FOR SELECT USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_insert ON "pastas_juridicas" FOR INSERT WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_update ON "pastas_juridicas" FOR UPDATE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid) WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_delete ON "pastas_juridicas" FOR DELETE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);

-- Não há migração automática de `pastas` documentais: não existe regra segura
-- para inferir dossiês jurídicos a partir de organização de arquivos.
