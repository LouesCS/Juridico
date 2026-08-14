-- Sprint 09 (Documentos e Pastas) — achado real: `documentos.hash_sha256`
-- era NOT NULL, mas o fluxo de presign (docs/api/10-documents.md §10.3) cria
-- a linha antes do hash existir (só calculado no passo de confirm). Torna a
-- coluna nullable; nenhuma linha existente é afetada (tabela sem dado real
-- ainda, módulo recém-implementado nesta rodada).

ALTER TABLE "documentos" ALTER COLUMN "hash_sha256" DROP NOT NULL;
