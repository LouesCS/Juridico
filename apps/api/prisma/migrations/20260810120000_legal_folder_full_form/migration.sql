-- Evolução aditiva da Pasta Jurídica. Registros legados permanecem válidos.
CREATE TYPE "TipoVinculoPastaJuridica" AS ENUM ('CLIENTE', 'PARTE_CONTRARIA', 'INTERESSADO');
CREATE TYPE "TipoOpcaoPastaJuridica" AS ENUM ('CATEGORIA', 'SITUACAO', 'ETAPA');
ALTER TYPE "TipoCampoExtra" ADD VALUE IF NOT EXISTS 'TEXTAREA';

ALTER TABLE "pastas_juridicas"
  ADD COLUMN "prefixo" TEXT,
  ADD COLUMN "sequencial" INTEGER,
  ADD COLUMN "categoria" TEXT,
  ADD COLUMN "etapa" TEXT;

CREATE UNIQUE INDEX "uq_pastas_juridicas_escritorio_prefixo_sequencial"
  ON "pastas_juridicas"("escritorio_id", "prefixo", "sequencial");

CREATE TABLE "prefixos_pasta_juridica" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "escritorio_id" UUID NOT NULL,
  "prefixo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "proximo_numero" INTEGER NOT NULL DEFAULT 1,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "prefixos_pasta_juridica_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prefixos_pasta_juridica_escritorio_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_prefixos_pasta_juridica_escritorio_prefixo" ON "prefixos_pasta_juridica"("escritorio_id", "prefixo");
CREATE INDEX "idx_prefixos_pasta_juridica_escritorio_ativo" ON "prefixos_pasta_juridica"("escritorio_id", "ativo");

CREATE TABLE "pasta_juridica_clientes" (
  "pasta_juridica_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "tipo" "TipoVinculoPastaJuridica" NOT NULL,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pasta_juridica_clientes_pkey" PRIMARY KEY ("pasta_juridica_id", "cliente_id", "tipo"),
  CONSTRAINT "pasta_juridica_clientes_pasta_fkey" FOREIGN KEY ("pasta_juridica_id") REFERENCES "pastas_juridicas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pasta_juridica_clientes_cliente_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_pasta_juridica_clientes_cliente_tipo" ON "pasta_juridica_clientes"("cliente_id", "tipo");

CREATE TABLE "opcoes_pasta_juridica" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "escritorio_id" UUID NOT NULL,
 "tipo" "TipoOpcaoPastaJuridica" NOT NULL, "valor" TEXT NOT NULL, "label" TEXT NOT NULL,
 "ordem" INTEGER NOT NULL DEFAULT 0, "ativo" BOOLEAN NOT NULL DEFAULT true,
 "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMPTZ NOT NULL,
 CONSTRAINT "opcoes_pasta_juridica_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "opcoes_pasta_juridica_escritorio_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_opcoes_pasta_juridica_escritorio_tipo_valor" ON "opcoes_pasta_juridica"("escritorio_id","tipo","valor");
CREATE INDEX "idx_opcoes_pasta_juridica_escritorio_tipo_ativo" ON "opcoes_pasta_juridica"("escritorio_id","tipo","ativo");

ALTER TABLE "prefixos_pasta_juridica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prefixos_pasta_juridica" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_select ON "prefixos_pasta_juridica" FOR SELECT USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_insert ON "prefixos_pasta_juridica" FOR INSERT WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_update ON "prefixos_pasta_juridica" FOR UPDATE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid) WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_delete ON "prefixos_pasta_juridica" FOR DELETE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
ALTER TABLE "opcoes_pasta_juridica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opcoes_pasta_juridica" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_select ON "opcoes_pasta_juridica" FOR SELECT USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_insert ON "opcoes_pasta_juridica" FOR INSERT WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_update ON "opcoes_pasta_juridica" FOR UPDATE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid) WITH CHECK ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_delete ON "opcoes_pasta_juridica" FOR DELETE USING ("escritorio_id" = current_setting('app.tenant_id', true)::uuid);

INSERT INTO "prefixos_pasta_juridica" ("id", "escritorio_id", "prefixo", "nome", "atualizado_em")
SELECT gen_random_uuid(), "id", 'GERAL', 'Geral', CURRENT_TIMESTAMP FROM "escritorios"
ON CONFLICT ("escritorio_id", "prefixo") DO NOTHING;

INSERT INTO "opcoes_pasta_juridica" ("id","escritorio_id","tipo","valor","label","ordem","atualizado_em")
SELECT gen_random_uuid(), e."id", v.tipo::"TipoOpcaoPastaJuridica", v.valor, v.label, v.ordem, CURRENT_TIMESTAMP
FROM "escritorios" e CROSS JOIN (VALUES
 ('ETAPA','CADASTRAMENTO','Cadastramento',1),
 ('CATEGORIA','Administrativa','Administrativa',1),('CATEGORIA','Cível','Cível',2),('CATEGORIA','Núcleo Bancário','Núcleo Bancário',3),('CATEGORIA','Previdência Pública','Previdência Pública',4),('CATEGORIA','Trabalhista','Trabalhista',5),('CATEGORIA','Tributária','Tributária',6),
 ('SITUACAO','BAIXADO','Baixado',1),('SITUACAO','CONTRARIO','Contrário',2),('SITUACAO','DESISTENCIA','Desistência',3),('SITUACAO','ANDAMENTO_FAVORAVEL','Andamento Favorável',4),('SITUACAO','INVIAVEL','Inviável',5),('SITUACAO','SUBSTABELECIDO','Substabelecido',6),('SITUACAO','SUSPENSO','Suspenso',7)
) AS v(tipo,valor,label,ordem)
ON CONFLICT ("escritorio_id","tipo","valor") DO NOTHING;

INSERT INTO "campos_extra" ("id", "escritorio_id", "entidade", "nome", "chave", "tipo", "obrigatorio", "opcoes", "ordem", "ativo", "criado_em", "atualizado_em")
SELECT gen_random_uuid(), e."id", 'PASTA_JURIDICA'::"EntidadeConfiguravel", v.nome, v.chave, v.tipo::"TipoCampoExtra", false, v.opcoes, v.ordem, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "escritorios" e CROSS JOIN (VALUES
 ('Data do Atendimento','data_atendimento','DATA',ARRAY[]::TEXT[],1),
 ('Tipo de Atendimento','tipo_atendimento','SELECT',ARRAY['Online','Outros','Presencial','Em Sindicato'],2),
 ('Advogado Atendente','advogado_atendente','TEXTO',ARRAY[]::TEXT[],3),
 ('Sub Área','sub_area','SELECT',ARRAY['Acidentária','Acidente de Trabalho','Aposentadoria','Auxílio-doença','Cível','Consumo','Criminal','Defesa da Multa','FGTS','Outros Benefícios Previdenciários','Previdenciária Bancária','Público','Responsabilidade Civil','Seguro'],4),
 ('Setor Comercial','setor_comercial','BOOLEANO',ARRAY[]::TEXT[],5),
 ('Quem indicou?','quem_indicou','SELECT',ARRAY['Advogados Externos','Área Cível','Asseio','Indicado por Cliente','Já é Cliente','Mídias Sociais','Parceiro','Pós-venda','Prospecção'],6),
 ('Parceiro Quem?','parceiro_quem','TEXTO',ARRAY[]::TEXT[],7),
 ('Núcleos','nucleos','SELECT',ARRAY['Bancário','Civil','Concorde','FAP'],8),
 ('Nº da Pasta Física - Migração','numero_pasta_fisica','NUMERO',ARRAY[]::TEXT[],9),
 ('Assistente Técnico','assistente_tecnico','TEXTO',ARRAY[]::TEXT[],10),
 ('High Ticket','high_ticket','BOOLEANO',ARRAY[]::TEXT[],11),
 ('Outras Anotações','outras_anotacoes','TEXTAREA',ARRAY[]::TEXT[],12)
) AS v(nome,chave,tipo,opcoes,ordem)
ON CONFLICT ("escritorio_id", "entidade", "chave") DO NOTHING;

UPDATE "campos_extra" SET "obrigatorio" = true
WHERE "entidade" = 'PASTA_JURIDICA'::"EntidadeConfiguravel"
  AND "chave" IN ('data_atendimento','tipo_atendimento','advogado_atendente','sub_area','setor_comercial','quem_indicou','high_ticket');

-- Nenhum backfill de identificador, etapa ou categoria: não existe regra segura para dados legados.
