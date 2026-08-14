-- Sprint "Processos Judiciais" — reaproveita a modelagem formal de
-- ParteProcesso.principal (já usada por AUTOR/REU no Extrajudicial) para
-- também representar "advogado principal do polo" no Judicial, em vez de
-- criar uma coluna paralela (processo.advogadoPrincipalAutorId etc.).
ALTER TYPE "TipoParticipante" ADD VALUE 'ADVOGADO_AUTOR';
ALTER TYPE "TipoParticipante" ADD VALUE 'ADVOGADO_REU';

-- RO - Número do Benefício: campo textual novo, sem equivalente existente
-- no domínio (auditoria não encontrou nenhum campo semanticamente
-- equivalente). Nullable — não há valor a inventar para registros
-- existentes.
ALTER TABLE "processos"
  ADD COLUMN "ro_numero_beneficio" TEXT;

-- Estende o índice único parcial de principal para cobrir também os dois
-- novos papéis de advogado, preservando a regra "no máximo um principal
-- por (processo, tipo)" já usada por AUTOR/REU.
DROP INDEX "uq_partes_processo_principal_autor_reu";

CREATE UNIQUE INDEX "uq_partes_processo_principal_por_papel"
  ON "partes_processo"("processo_id", "tipo")
  WHERE "principal" = true
    AND "excluido_em" IS NULL
    AND "tipo" IN ('AUTOR', 'REU', 'ADVOGADO_AUTOR', 'ADVOGADO_REU');

-- Registros legados permanecem sem advogado principal. A escolha exige
-- ação explícita na próxima edição, evitando eleger silenciosamente o
-- primeiro advogado vinculado (mesmo princípio da migration anterior).
