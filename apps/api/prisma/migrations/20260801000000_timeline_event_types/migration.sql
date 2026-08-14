-- ============================================================================
-- Sprint 08 (Deadlines + Timeline) — extensão aditiva de `tipo_evento_timeline`.
-- NUNCA EXECUTADA contra Postgres real neste ambiente (mesma limitação de
-- todas as migrations anteriores, ver docs/backend-implementation/00-status.md).
--
-- `ALTER TYPE ... ADD VALUE` é aditivo e não bloqueia leituras/escritas
-- existentes; nenhum valor do enum original foi removido ou renomeado.
-- Cada `ADD VALUE` roda como comando isolado (não dentro de bloco `DO`),
-- reafirma a restrição do Postgres de não usar o valor recém-adicionado na
-- mesma transação em que foi criado — como esta migration só adiciona
-- valores (nunca os usa), não há conflito.
-- ============================================================================

ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'CRIACAO_PROCESSO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'ATUALIZACAO_PROCESSO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'ALTERACAO_RESPONSAVEL';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'ALTERACAO_PRIORIDADE';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'CLIENTE_ATUALIZADO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'EQUIPE_ALTERADA';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'SEGREDO_JUSTICA_ALTERADO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'ARQUIVAMENTO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'RESTAURACAO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'IA_EXECUTADA';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'IMPORTACAO';
ALTER TYPE "TipoEventoTimeline" ADD VALUE IF NOT EXISTS 'EXPORTACAO';
