-- Sprint 15 (Prompt 14) — Task Engine. Generaliza Timeline/IA/Comentários
-- para Tarefa (mesma técnica aditiva do Sprint 08/Sprint 11: enum ganha
-- valores novos via ADD VALUE, coluna vira nullable, colunas novas
-- opcionais) e cria as tabelas novas do motor de tarefas. 100% aditivo,
-- nenhuma tabela/coluna existente é removida ou renomeada. Nunca aplicada
-- contra Postgres real neste ambiente (sem Docker/Postgres disponível,
-- mesma limitação de todas as rodadas anteriores).

-- ---------------------------------------------------------------------------
-- Timeline — generalizada para Tarefa (Processo continua o padrão default)
-- ---------------------------------------------------------------------------
ALTER TYPE "TipoEventoTimeline" ADD VALUE 'CRIACAO_TAREFA';
ALTER TYPE "TipoEventoTimeline" ADD VALUE 'CONCLUSAO_TAREFA';
ALTER TYPE "TipoEventoTimeline" ADD VALUE 'CANCELAMENTO_TAREFA';

CREATE TYPE "EscopoEventoTimeline" AS ENUM ('PROCESSO', 'TAREFA');

ALTER TABLE "eventos_timeline" ALTER COLUMN "processo_id" DROP NOT NULL;
ALTER TABLE "eventos_timeline" ADD COLUMN "escopo_tipo" "EscopoEventoTimeline" NOT NULL DEFAULT 'PROCESSO';
ALTER TABLE "eventos_timeline" ADD COLUMN "tarefa_id" UUID;

-- ---------------------------------------------------------------------------
-- IA — ResumoIA/FonteIA generalizados para Tarefa (4º escopo, mesmo padrão
-- do Sprint 11 que já os generalizou para Documento/Cliente)
-- ---------------------------------------------------------------------------
ALTER TYPE "EscopoResumoIA" ADD VALUE 'TAREFA';
ALTER TYPE "TipoResumoIA" ADD VALUE 'TAREFA_RESUMO';
ALTER TYPE "TipoResumoIA" ADD VALUE 'TAREFA_CHECKLIST';
ALTER TYPE "TipoResumoIA" ADD VALUE 'TAREFA_PROXIMOS_PASSOS';
ALTER TYPE "TipoResumoIA" ADD VALUE 'TAREFA_DESCRICAO';
ALTER TYPE "TipoResumoIA" ADD VALUE 'TAREFA_CONTEXTO';
ALTER TYPE "TipoFonteIA" ADD VALUE 'TAREFA';

ALTER TABLE "resumos_ia" ADD COLUMN "tarefa_id" UUID;
ALTER TABLE "fontes_ia" ADD COLUMN "tarefa_id" UUID;

-- ---------------------------------------------------------------------------
-- Comentários — reaproveita o modelo já existente desde a Fase 1
-- ---------------------------------------------------------------------------
ALTER TABLE "comentarios" ADD COLUMN "tarefa_id" UUID;
CREATE INDEX "idx_comentarios_tarefa" ON "comentarios" ("tarefa_id", "criado_em");

-- ---------------------------------------------------------------------------
-- Task Engine — tabelas novas
-- ---------------------------------------------------------------------------
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL', 'DIAS_UTEIS', 'DIAS_ESPECIFICOS');
CREATE TYPE "TipoVinculoTarefa" AS ENUM ('CLIENTE', 'PROCESSO', 'DOCUMENTO', 'CONTRATO', 'SERVICO', 'FINANCEIRO', 'PUBLICACAO', 'PEDIDO', 'REGISTRO_TRABALHO');

CREATE TABLE "tarefa_recorrencias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "dias_semana" INTEGER[] NOT NULL DEFAULT '{}',
    "respeitar_dias_uteis" BOOLEAN NOT NULL DEFAULT false,
    "data_fim" DATE,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tarefa_recorrencias_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "tarefa_recorrencias" ADD CONSTRAINT "tarefa_recorrencias_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "tarefas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria_id" UUID,
    "status_id" UUID,
    "prioridade_id" UUID,
    "modelo_origem_id" UUID,
    "responsavel_principal_id" UUID,
    "equipe_id" UUID,
    "grupo_colaboradores_id" UUID,
    "data_inicio" DATE,
    "data_vencimento" DATE,
    "recorrencia_id" UUID,
    "tarefa_origem_id" UUID,
    "criado_por_id" UUID NOT NULL,
    "concluida_em" TIMESTAMPTZ,
    "cancelada_em" TIMESTAMPTZ,
    "motivo_cancelamento" TEXT,
    "arquivada_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "tarefa_recorrencias"("id") ON DELETE SET NULL;
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_tarefa_origem_id_fkey" FOREIGN KEY ("tarefa_origem_id") REFERENCES "tarefas"("id") ON DELETE SET NULL;
CREATE INDEX "idx_tarefas_escritorio_responsavel" ON "tarefas" ("escritorio_id", "responsavel_principal_id");
CREATE INDEX "idx_tarefas_escritorio_vencimento" ON "tarefas" ("escritorio_id", "data_vencimento");
CREATE INDEX "idx_tarefas_escritorio_status" ON "tarefas" ("escritorio_id", "status_id");
CREATE INDEX "idx_tarefas_escritorio_categoria" ON "tarefas" ("escritorio_id", "categoria_id");
CREATE INDEX "idx_tarefas_escritorio_equipe" ON "tarefas" ("escritorio_id", "equipe_id");

ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;
CREATE INDEX "idx_timeline_tarefa_data" ON "eventos_timeline" ("tarefa_id", "data_evento" DESC);
ALTER TABLE "resumos_ia" ADD CONSTRAINT "resumos_ia_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE RESTRICT;
CREATE INDEX "idx_resumos_ia_tarefa_tipo_vigente" ON "resumos_ia" ("tarefa_id", "tipo_resumo", "vigente");
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE SET NULL;
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;

CREATE TABLE "tarefa_checklist_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "concluido_em" TIMESTAMPTZ,
    "concluido_por_id" UUID,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tarefa_checklist_itens_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "tarefa_checklist_itens" ADD CONSTRAINT "tarefa_checklist_itens_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;
CREATE INDEX "idx_tarefa_checklist_tarefa" ON "tarefa_checklist_itens" ("tarefa_id", "ordem");

CREATE TABLE "tarefa_responsaveis_auxiliares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,

    CONSTRAINT "tarefa_responsaveis_auxiliares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_tarefa_responsavel_auxiliar" ON "tarefa_responsaveis_auxiliares" ("tarefa_id", "membro_id");
ALTER TABLE "tarefa_responsaveis_auxiliares" ADD CONSTRAINT "tarefa_responsaveis_auxiliares_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;

CREATE TABLE "tarefa_dependencias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "depende_de_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tarefa_dependencias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_tarefa_dependencia" ON "tarefa_dependencias" ("tarefa_id", "depende_de_id");
ALTER TABLE "tarefa_dependencias" ADD CONSTRAINT "tarefa_dependencias_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;
ALTER TABLE "tarefa_dependencias" ADD CONSTRAINT "tarefa_dependencias_depende_de_id_fkey" FOREIGN KEY ("depende_de_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;

CREATE TABLE "tarefa_vinculos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tarefa_id" UUID NOT NULL,
    "tipo_recurso" "TipoVinculoTarefa" NOT NULL,
    "recurso_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tarefa_vinculos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_tarefa_vinculo" ON "tarefa_vinculos" ("tarefa_id", "tipo_recurso", "recurso_id");
CREATE INDEX "idx_tarefa_vinculo_recurso" ON "tarefa_vinculos" ("tipo_recurso", "recurso_id");
ALTER TABLE "tarefa_vinculos" ADD CONSTRAINT "tarefa_vinculos_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;

CREATE TABLE "tarefa_favorito" (
    "tarefa_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tarefa_favorito_pkey" PRIMARY KEY ("tarefa_id", "membro_id")
);
ALTER TABLE "tarefa_favorito" ADD CONSTRAINT "tarefa_favorito_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE;
