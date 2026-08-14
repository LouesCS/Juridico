CREATE TYPE "StatusConfiguracaoCaptura" AS ENUM ('ATIVA', 'PAUSADA', 'SINCRONIZANDO', 'ERRO');
CREATE TYPE "ResultadoSincronizacaoCaptura" AS ENUM ('SUCESSO', 'SEM_NOVIDADES', 'NAO_ENCONTRADO', 'ERRO');
CREATE TYPE "ProvedorCapturaJudicial" AS ENUM ('DATAJUD', 'DJEN');

CREATE TABLE "configuracoes_captura" (
  "id" UUID NOT NULL,
  "escritorio_id" UUID NOT NULL,
  "processo_id" UUID,
  "numero_cnj" TEXT NOT NULL,
  "numero_cnj_somente_digitos" TEXT NOT NULL,
  "captura_ativa" BOOLEAN NOT NULL DEFAULT true,
  "status" "StatusConfiguracaoCaptura" NOT NULL DEFAULT 'ATIVA',
  "ultimo_resultado" "ResultadoSincronizacaoCaptura",
  "ultima_sincronizacao_em" TIMESTAMPTZ,
  "proxima_sincronizacao_em" TIMESTAMPTZ,
  "novidades_ultima_captura" INTEGER NOT NULL DEFAULT 0,
  "ultimo_erro_publico" TEXT,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "configuracoes_captura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "historicos_sincronizacao_captura" (
  "id" UUID NOT NULL,
  "escritorio_id" UUID NOT NULL,
  "configuracao_id" UUID NOT NULL,
  "provider" "ProvedorCapturaJudicial" NOT NULL,
  "resultado" "ResultadoSincronizacaoCaptura" NOT NULL,
  "novidades" INTEGER NOT NULL DEFAULT 0,
  "erro_publico" TEXT,
  "duracao_ms" INTEGER,
  "sincronizado_por" UUID,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historicos_sincronizacao_captura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movimentos_judiciais_capturados" (
  "id" UUID NOT NULL,
  "escritorio_id" UUID NOT NULL,
  "processo_id" UUID,
  "provider" "ProvedorCapturaJudicial" NOT NULL,
  "external_id" TEXT NOT NULL,
  "numero_cnj" TEXT NOT NULL,
  "data_movimento" TIMESTAMPTZ NOT NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "tribunal" TEXT,
  "payload_bruto" JSONB,
  "capturado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimentos_judiciais_capturados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publicacoes_judiciais_capturadas" (
  "id" UUID NOT NULL,
  "escritorio_id" UUID NOT NULL,
  "processo_id" UUID,
  "provider" "ProvedorCapturaJudicial" NOT NULL,
  "external_id" TEXT NOT NULL,
  "numero_cnj" TEXT NOT NULL,
  "data_publicacao" TIMESTAMPTZ,
  "data_disponibilizacao" TIMESTAMPTZ,
  "tipo_comunicacao" TEXT,
  "conteudo" TEXT,
  "tribunal" TEXT,
  "payload_bruto" JSONB,
  "capturado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publicacoes_judiciais_capturadas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_config_captura_escritorio_cnj" ON "configuracoes_captura"("escritorio_id", "numero_cnj_somente_digitos");
CREATE INDEX "idx_config_captura_escritorio_status" ON "configuracoes_captura"("escritorio_id", "status");
CREATE INDEX "idx_config_captura_ultima_sync" ON "configuracoes_captura"("escritorio_id", "ultima_sincronizacao_em" DESC);
CREATE INDEX "idx_historico_captura_config" ON "historicos_sincronizacao_captura"("escritorio_id", "configuracao_id", "criado_em" DESC);
CREATE UNIQUE INDEX "uq_movimento_capturado_external" ON "movimentos_judiciais_capturados"("escritorio_id", "provider", "external_id");
CREATE INDEX "idx_movimento_capturado_cnj" ON "movimentos_judiciais_capturados"("escritorio_id", "numero_cnj", "data_movimento" DESC);
CREATE UNIQUE INDEX "uq_publicacao_capturada_external" ON "publicacoes_judiciais_capturadas"("escritorio_id", "provider", "external_id");
CREATE INDEX "idx_publicacao_capturada_cnj" ON "publicacoes_judiciais_capturadas"("escritorio_id", "numero_cnj", "data_publicacao" DESC);

ALTER TABLE "configuracoes_captura" ADD CONSTRAINT "configuracoes_captura_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracoes_captura" ADD CONSTRAINT "configuracoes_captura_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "historicos_sincronizacao_captura" ADD CONSTRAINT "historicos_captura_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historicos_sincronizacao_captura" ADD CONSTRAINT "historicos_captura_configuracao_id_fkey" FOREIGN KEY ("configuracao_id") REFERENCES "configuracoes_captura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimentos_judiciais_capturados" ADD CONSTRAINT "movimentos_capturados_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimentos_judiciais_capturados" ADD CONSTRAINT "movimentos_capturados_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publicacoes_judiciais_capturadas" ADD CONSTRAINT "publicacoes_capturadas_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicacoes_judiciais_capturadas" ADD CONSTRAINT "publicacoes_capturadas_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['configuracoes_captura','historicos_sincronizacao_captura','movimentos_judiciais_capturados','publicacoes_judiciais_capturadas'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)', tabela);
  END LOOP;
END $$;
