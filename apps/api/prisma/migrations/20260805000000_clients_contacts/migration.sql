-- Sprint 17 — Clientes e Contatos. 100% aditivo: novo enums, novas colunas
-- opcionais em "clientes", nova tabela de favoritos. Nenhuma coluna/tabela
-- existente é removida ou renomeada. Nunca aplicada contra Postgres real
-- neste ambiente (sem Docker/Postgres disponível, mesma limitação de todas
-- as rodadas anteriores).

CREATE TYPE "TipoRelacionamentoCliente" AS ENUM ('CLIENTE', 'CONTATO', 'CLIENTE_E_CONTATO');
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');

ALTER TABLE "clientes" ADD COLUMN "categoria_relacionamento" "TipoRelacionamentoCliente" NOT NULL DEFAULT 'CLIENTE';
ALTER TABLE "clientes" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "clientes" ADD COLUMN "nome_mae" TEXT;
ALTER TABLE "clientes" ADD COLUMN "nome_pai" TEXT;
ALTER TABLE "clientes" ADD COLUMN "estado_civil" "EstadoCivil";
ALTER TABLE "clientes" ADD COLUMN "profissao" TEXT;
ALTER TABLE "clientes" ADD COLUMN "data_nascimento" DATE;
ALTER TABLE "clientes" ADD COLUMN "campos_extras_valores" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "idx_clientes_escritorio_categoria" ON "clientes" ("escritorio_id", "categoria_relacionamento");

CREATE TABLE "cliente_favorito" (
    "cliente_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "cliente_favorito_pkey" PRIMARY KEY ("cliente_id", "membro_id")
);
ALTER TABLE "cliente_favorito" ADD CONSTRAINT "cliente_favorito_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE;
