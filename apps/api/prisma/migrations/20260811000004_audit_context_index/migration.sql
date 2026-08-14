-- Índice composto para a consulta contextual paginada do Audit Engine.
-- Mantém o tenant como primeira coluna e a ordenação cronológica no próprio índice.
CREATE INDEX "idx_auditoria_contexto"
ON "log_auditoria"("escritorio_id", "recurso_tipo", "recurso_id", "criado_em" DESC);
