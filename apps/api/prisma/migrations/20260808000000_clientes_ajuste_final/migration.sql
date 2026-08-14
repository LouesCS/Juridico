-- Ajuste aditivo: campos novos sem remover categoria/status legados.
ALTER TABLE "clientes"
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "responsavel_nome" TEXT,
  ADD COLUMN "telefone_residencial" TEXT,
  ADD COLUMN "telefone_responsavel" TEXT;

CREATE INDEX "idx_clientes_escritorio_rg" ON "clientes"("escritorio_id", "rg");

-- Completa o suporte já existente de Campos Extras com valor padrão.
ALTER TABLE "campos_extra" ADD COLUMN "valor_padrao" TEXT;
