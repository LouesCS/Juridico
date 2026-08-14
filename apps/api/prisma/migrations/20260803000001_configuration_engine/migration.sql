-- Sprint 13 (Prompt 13) — Configuration Engine.
-- Geral/Financeiro/IA reaproveitam a coluna `escritorios.configuracoes`
-- (jsonb, existia desde a Fase 1, nunca usada) — nenhuma alteração de tabela
-- para esses três. Os 7 catálogos abaixo têm ciclo de vida próprio (CRUD, N
-- linhas por escritório), por isso são tabelas novas. Migration 100% aditiva:
-- nenhuma tabela existente é alterada.

CREATE TYPE "EntidadeConfiguravel" AS ENUM ('CLIENTE', 'PROCESSO', 'DOCUMENTO', 'TAREFA');
CREATE TYPE "TipoCampoExtra" AS ENUM ('TEXTO', 'NUMERO', 'DATA', 'BOOLEANO', 'SELECT', 'MULTISELECT');
CREATE TYPE "TipoFeriado" AS ENUM ('NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FORENSE', 'PERSONALIZADO');

CREATE TABLE "campos_extra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "entidade" "EntidadeConfiguravel" NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" "TipoCampoExtra" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "opcoes" TEXT[] NOT NULL DEFAULT '{}',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "campos_extra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_campos_extra_escritorio_entidade_chave" ON "campos_extra"("escritorio_id", "entidade", "chave");
CREATE INDEX "idx_campos_extra_escritorio_entidade" ON "campos_extra"("escritorio_id", "entidade");
ALTER TABLE "campos_extra" ADD CONSTRAINT "campos_extra_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "campos_obrigatorios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "entidade" "EntidadeConfiguravel" NOT NULL,
    "campo" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campos_obrigatorios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_campos_obrigatorios_escritorio_entidade_campo" ON "campos_obrigatorios"("escritorio_id", "entidade", "campo");
ALTER TABLE "campos_obrigatorios" ADD CONSTRAINT "campos_obrigatorios_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "conjuntos_valores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "conjuntos_valores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_conjuntos_valores_escritorio_nome" ON "conjuntos_valores"("escritorio_id", "nome");
ALTER TABLE "conjuntos_valores" ADD CONSTRAINT "conjuntos_valores_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "conjunto_valor_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conjunto_id" UUID NOT NULL,
    "valor" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conjunto_valor_itens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_conjunto_valor_itens_conjunto" ON "conjunto_valor_itens"("conjunto_id");
ALTER TABLE "conjunto_valor_itens" ADD CONSTRAINT "conjunto_valor_itens_conjunto_id_fkey" FOREIGN KEY ("conjunto_id") REFERENCES "conjuntos_valores"("id") ON DELETE CASCADE;

CREATE TABLE "categorias_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6366F1',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "categorias_tarefa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_categorias_tarefa_escritorio_nome" ON "categorias_tarefa"("escritorio_id", "nome");
ALTER TABLE "categorias_tarefa" ADD CONSTRAINT "categorias_tarefa_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "grupos_colaboradores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "grupos_colaboradores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_grupos_colaboradores_escritorio_nome" ON "grupos_colaboradores"("escritorio_id", "nome");
ALTER TABLE "grupos_colaboradores" ADD CONSTRAINT "grupos_colaboradores_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;

CREATE TABLE "grupo_colaborador_membros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grupo_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,

    CONSTRAINT "grupo_colaborador_membros_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_grupo_colaborador_membros" ON "grupo_colaborador_membros"("grupo_id", "membro_id");
CREATE INDEX "idx_grupo_colaborador_membros_membro" ON "grupo_colaborador_membros"("membro_id");
ALTER TABLE "grupo_colaborador_membros" ADD CONSTRAINT "grupo_colaborador_membros_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos_colaboradores"("id") ON DELETE CASCADE;
ALTER TABLE "grupo_colaborador_membros" ADD CONSTRAINT "grupo_colaborador_membros_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE;

CREATE TABLE "modelos_tarefa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria_id" UUID,
    "prazo_dias_padrao" INTEGER NOT NULL DEFAULT 0,
    "prioridade_padrao" TEXT NOT NULL DEFAULT 'MEDIA',
    "checklist" TEXT[] NOT NULL DEFAULT '{}',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "modelos_tarefa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_modelos_tarefa_escritorio" ON "modelos_tarefa"("escritorio_id");
ALTER TABLE "modelos_tarefa" ADD CONSTRAINT "modelos_tarefa_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;
ALTER TABLE "modelos_tarefa" ADD CONSTRAINT "modelos_tarefa_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_tarefa"("id") ON DELETE SET NULL;

CREATE TABLE "feriados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "TipoFeriado" NOT NULL DEFAULT 'PERSONALIZADO',
    "uf" VARCHAR(2),
    "recorrente_anual" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_feriados_escritorio_nome_data" ON "feriados"("escritorio_id", "nome", "data");
CREATE INDEX "idx_feriados_escritorio_data" ON "feriados"("escritorio_id", "data");
ALTER TABLE "feriados" ADD CONSTRAINT "feriados_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE;
