CREATE TABLE "pedidos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "escritorio_id" UUID NOT NULL,
  "pasta_juridica_id" UUID NOT NULL,
  "processo_id" UUID,
  "descricao" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "situacao" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  "data_finalizacao" DATE,
  "estimativa_exito" DECIMAL(5,2),
  "valor_pedido_centavos" BIGINT,
  "valor_provavel_centavos" BIGINT,
  "valor_possivel_centavos" BIGINT,
  "valor_remoto_centavos" BIGINT,
  "valor_final_centavos" BIGINT,
  "anotacoes" VARCHAR(1000),
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  "excluido_em" TIMESTAMPTZ,
  CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pedidos_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pedidos_pasta_juridica_id_fkey" FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pedidos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ck_pedidos_estimativa" CHECK ("estimativa_exito" IS NULL OR ("estimativa_exito" >= 0 AND "estimativa_exito" <= 100)),
  CONSTRAINT "ck_pedidos_valores" CHECK (
    ("valor_pedido_centavos" IS NULL OR "valor_pedido_centavos" >= 0) AND
    ("valor_provavel_centavos" IS NULL OR "valor_provavel_centavos" >= 0) AND
    ("valor_possivel_centavos" IS NULL OR "valor_possivel_centavos" >= 0) AND
    ("valor_remoto_centavos" IS NULL OR "valor_remoto_centavos" >= 0) AND
    ("valor_final_centavos" IS NULL OR "valor_final_centavos" >= 0)
  )
);
CREATE INDEX "idx_pedidos_escritorio_pasta" ON "pedidos"("escritorio_id", "pasta_juridica_id");
CREATE INDEX "idx_pedidos_escritorio_situacao" ON "pedidos"("escritorio_id", "situacao");
CREATE INDEX "idx_pedidos_escritorio_criado" ON "pedidos"("escritorio_id", "criado_em" DESC);
CREATE INDEX "idx_pedidos_escritorio_processo" ON "pedidos"("escritorio_id", "processo_id");
