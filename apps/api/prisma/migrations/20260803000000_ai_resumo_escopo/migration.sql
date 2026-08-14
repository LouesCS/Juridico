-- Sprint 11 (Assistente Jurídico Inteligente) — `resumos_ia.processo_id` era
-- NOT NULL (só cobria "Resumir Processo"); o Sprint 11 pede também "Resumir
-- Documento" e "Histórico Inteligente" de Cliente. Torna a coluna nullable e
-- adiciona `documento_id`/`cliente_id` + `escopo_tipo` (exatamente um dos três
-- é preenchido, de acordo com `escopo_tipo` — invariante da aplicação, não
-- CHECK de banco, mesmo padrão já usado neste projeto). Mesma nota de todas as
-- migrations anteriores: aditiva, nunca aplicada contra Postgres real neste
-- ambiente (sem Postgres/Docker).

CREATE TYPE "EscopoResumoIA" AS ENUM ('PROCESSO', 'DOCUMENTO', 'CLIENTE');

ALTER TYPE "TipoResumoIA" ADD VALUE 'RESUMO_DOCUMENTO';
ALTER TYPE "TipoResumoIA" ADD VALUE 'HISTORICO_CLIENTE';

ALTER TYPE "TipoFonteIA" ADD VALUE 'PROCESSO';
ALTER TYPE "TipoFonteIA" ADD VALUE 'CLIENTE';

ALTER TABLE "resumos_ia" ALTER COLUMN "processo_id" DROP NOT NULL;
ALTER TABLE "resumos_ia" ADD COLUMN "escopo_tipo" "EscopoResumoIA" NOT NULL DEFAULT 'PROCESSO';
ALTER TABLE "resumos_ia" ADD COLUMN "documento_id" UUID;
ALTER TABLE "resumos_ia" ADD COLUMN "cliente_id" UUID;

ALTER TABLE "resumos_ia" ADD CONSTRAINT "resumos_ia_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT;
ALTER TABLE "resumos_ia" ADD CONSTRAINT "resumos_ia_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_resumos_ia_documento_tipo_vigente" ON "resumos_ia" ("documento_id", "tipo_resumo", "vigente");
CREATE INDEX "idx_resumos_ia_cliente_tipo_vigente" ON "resumos_ia" ("cliente_id", "tipo_resumo", "vigente");
CREATE INDEX "idx_resumos_ia_escritorio_periodo" ON "resumos_ia" ("escritorio_id", "criado_em");

ALTER TABLE "fontes_ia" ADD COLUMN "processo_id" UUID;
ALTER TABLE "fontes_ia" ADD COLUMN "cliente_id" UUID;
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_processo_id_fkey"
  FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL;
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL;
