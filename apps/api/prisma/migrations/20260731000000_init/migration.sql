-- CreateEnum
CREATE TYPE "TemaUsuario" AS ENUM ('CLARO', 'ESCURO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('PENDENTE', 'ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "ProvedorAuth" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT', 'SAML');

-- CreateEnum
CREATE TYPE "MotivoRevogacaoSessao" AS ENUM ('LOGOUT', 'TROCA_SENHA', 'REUSO_DETECTADO', 'ADMIN', 'EXPIRACAO');

-- CreateEnum
CREATE TYPE "StatusEscritorio" AS ENUM ('TRIAL', 'ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PlanoEscritorio" AS ENUM ('TRIAL', 'ESSENCIAL', 'PROFISSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "StatusMembro" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');

-- CreateEnum
CREATE TYPE "StatusConvite" AS ENUM ('PENDENTE', 'ACEITO', 'EXPIRADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "EscopoPermissao" AS ENUM ('ALL', 'TEAM', 'ASSIGNED', 'OWN');

-- CreateEnum
CREATE TYPE "EfeitoPermissao" AS ENUM ('CONCEDER', 'NEGAR');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('ATIVO', 'INATIVO', 'PROSPECT');

-- CreateEnum
CREATE TYPE "TipoProcesso" AS ENUM ('JUDICIAL', 'ADMINISTRATIVO', 'CONSULTIVO', 'EXTRAJUDICIAL');

-- CreateEnum
CREATE TYPE "InstanciaProcesso" AS ENUM ('PRIMEIRA', 'SEGUNDA', 'SUPERIOR');

-- CreateEnum
CREATE TYPE "PoloProcesso" AS ENUM ('ATIVO', 'PASSIVO', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "PrioridadeProcesso" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoParticipante" AS ENUM ('AUTOR', 'REU', 'TERCEIRO_INTERESSADO', 'ASSISTENTE', 'MINISTERIO_PUBLICO', 'TESTEMUNHA', 'PERITO', 'ADVOGADO_EXTERNO', 'JUIZ', 'PROMOTOR', 'REPRESENTANTE_LEGAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "NaturezaPessoa" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- CreateEnum
CREATE TYPE "NivelAcessoProcesso" AS ENUM ('LEITURA', 'LEITURA_ESCRITA');

-- CreateEnum
CREATE TYPE "TipoRelacaoProcesso" AS ENUM ('PRINCIPAL', 'DEPENDENTE', 'RECURSO', 'CUMPRIMENTO', 'CONEXO', 'APENSO', 'RELACIONADO');

-- CreateEnum
CREATE TYPE "TipoPrazo" AS ENUM ('FATAL', 'INTERNO', 'AUDIENCIA', 'REUNIAO', 'TAREFA');

-- CreateEnum
CREATE TYPE "PrioridadePrazo" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "StatusPrazo" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "OrigemPrazo" AS ENUM ('MANUAL', 'IMPORTADO', 'IA', 'TRIBUNAL');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('S3', 'LOCAL');

-- CreateEnum
CREATE TYPE "StatusUpload" AS ENUM ('PENDENTE', 'CONCLUIDO', 'FALHA');

-- CreateEnum
CREATE TYPE "StatusProcessamentoDocumento" AS ENUM ('PENDENTE', 'PROCESSANDO', 'PRONTO', 'FALHA');

-- CreateEnum
CREATE TYPE "StatusAntivirus" AS ENUM ('PENDENTE', 'LIMPO', 'INFECTADO', 'ERRO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PETICAO', 'CONTRATO', 'PROCURACAO', 'SENTENCA', 'DECISAO', 'COMPROVANTE', 'PARECER', 'OUTRO');

-- CreateEnum
CREATE TYPE "NivelConfidencialidade" AS ENUM ('PADRAO', 'CONFIDENCIAL');

-- CreateEnum
CREATE TYPE "Visibilidade" AS ENUM ('INTERNA', 'COMPARTILHADA', 'PUBLICA');

-- CreateEnum
CREATE TYPE "TipoEventoTimeline" AS ENUM ('MOVIMENTACAO', 'PETICAO', 'AUDIENCIA', 'DECISAO', 'SENTENCA', 'DOCUMENTO', 'COMENTARIO', 'ALTERACAO_STATUS', 'PRAZO', 'ANOTACAO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "OrigemEvento" AS ENUM ('MANUAL', 'SISTEMA', 'IA', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "TipoResumoIA" AS ENUM ('GERAL', 'EXECUTIVO', 'CRONOLOGICO', 'PONTOS_CHAVE', 'RISCOS');

-- CreateEnum
CREATE TYPE "StatusResumoIA" AS ENUM ('PENDENTE', 'GERANDO', 'PRONTO', 'FALHA', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "FeedbackResumo" AS ENUM ('POSITIVO', 'NEGATIVO');

-- CreateEnum
CREATE TYPE "TipoFonteIA" AS ENUM ('DOCUMENTO', 'EVENTO_TIMELINE', 'METADADO_PROCESSO');

-- CreateEnum
CREATE TYPE "PrioridadeNotificacao" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'SEGURANCA');

-- CreateEnum
CREATE TYPE "FrequenciaNotificacao" AS ENUM ('IMEDIATA', 'DIARIA', 'SEMANAL', 'NUNCA');

-- CreateEnum
CREATE TYPE "TipoAtor" AS ENUM ('USUARIO', 'SISTEMA', 'API');

-- CreateEnum
CREATE TYPE "ResultadoAuditoria" AS ENUM ('SUCESSO', 'FALHA', 'NEGADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verificado_em" TIMESTAMPTZ,
    "senha_hash" TEXT,
    "avatar_url" TEXT,
    "telefone" TEXT,
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "tema" "TemaUsuario" NOT NULL DEFAULT 'SISTEMA',
    "status" "StatusUsuario" NOT NULL DEFAULT 'PENDENTE',
    "mfa_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "mfa_segredo" TEXT,
    "ultimo_acesso_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "provider" "ProvedorAuth" NOT NULL,
    "provider_account_id" TEXT,
    "email_no_provedor" TEXT,
    "email_verificado_no_provedor" BOOLEAN NOT NULL DEFAULT false,
    "access_token_criptografado" BYTEA,
    "refresh_token_criptografado" BYTEA,
    "escopos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expira_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMPTZ NOT NULL,
    "usado_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "escritorio_ativo_id" UUID NOT NULL,
    "familia_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "dispositivo" TEXT,
    "criada_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ NOT NULL,
    "revogada_em" TIMESTAMPTZ,
    "motivo_revogacao" "MotivoRevogacaoSessao",

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escritorios" (
    "id" UUID NOT NULL,
    "razao_social" TEXT,
    "nome_fantasia" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco_logradouro" TEXT,
    "endereco_numero" TEXT,
    "endereco_complemento" TEXT,
    "endereco_bairro" TEXT,
    "endereco_cidade" TEXT,
    "endereco_uf" CHAR(2),
    "endereco_cep" TEXT,
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "status" "StatusEscritorio" NOT NULL DEFAULT 'TRIAL',
    "plano" "PlanoEscritorio" NOT NULL DEFAULT 'TRIAL',
    "configuracoes" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "escritorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papeis" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "nivel" INTEGER NOT NULL,
    "eh_sistema" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "papeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "escopo" "EscopoPermissao" NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papel_permissao" (
    "papel_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,

    CONSTRAINT "papel_permissao_pkey" PRIMARY KEY ("papel_id","permissao_id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "lider_id" UUID,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "papel_id" UUID NOT NULL,
    "equipe_id" UUID,
    "cargo" TEXT,
    "status" "StatusMembro" NOT NULL DEFAULT 'ATIVO',
    "entrou_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convidado_por_id" UUID,
    "data_aceite_convite" TIMESTAMPTZ,
    "configuracoes_especificas" JSONB NOT NULL DEFAULT '{}',
    "desativado_em" TIMESTAMPTZ,
    "desativado_por_id" UUID,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes_usuario" (
    "id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "efeito" "EfeitoPermissao" NOT NULL,
    "concedida_por_id" UUID NOT NULL,
    "expira_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convites" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "papel_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "convidado_por_id" UUID NOT NULL,
    "expira_em" TIMESTAMPTZ NOT NULL,
    "status" "StatusConvite" NOT NULL DEFAULT 'PENDENTE',
    "aceito_por_id" UUID,
    "data_aceite" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "tipo" "TipoCliente" NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_social" TEXT,
    "razao_social" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telefones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "endereco_logradouro" TEXT,
    "endereco_numero" TEXT,
    "endereco_complemento" TEXT,
    "endereco_bairro" TEXT,
    "endereco_cidade" TEXT,
    "endereco_uf" CHAR(2),
    "endereco_cep" TEXT,
    "observacoes" TEXT,
    "responsavel_id" UUID,
    "status" "StatusCliente" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "numero_cnj" TEXT,
    "numero_interno" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "area" TEXT NOT NULL,
    "tipo_acao" TEXT,
    "tipo" "TipoProcesso" NOT NULL DEFAULT 'JUDICIAL',
    "tribunal" TEXT,
    "comarca" TEXT,
    "vara" TEXT,
    "uf" CHAR(2),
    "instancia" "InstanciaProcesso",
    "classe_processual" TEXT,
    "assunto" TEXT,
    "polo_cliente" "PoloProcesso" NOT NULL,
    "status" "StatusProcesso" NOT NULL DEFAULT 'ATIVO',
    "prioridade" "PrioridadeProcesso" NOT NULL DEFAULT 'MEDIA',
    "segredo_justica" BOOLEAN NOT NULL DEFAULT false,
    "valor_causa_centavos" BIGINT,
    "moeda_valor_causa" CHAR(3) NOT NULL DEFAULT 'BRL',
    "data_distribuicao" DATE,
    "data_encerramento" DATE,
    "responsavel_principal_id" UUID NOT NULL,
    "proxima_data_relevante" TIMESTAMPTZ,
    "observacoes" TEXT,
    "campos_customizados" JSONB NOT NULL DEFAULT '{}',
    "resumo_ia_vigente_id" UUID,
    "ultima_atualizacao_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "arquivado_em" TIMESTAMPTZ,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partes_processo" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "tipo" "TipoParticipante" NOT NULL,
    "natureza" "NaturezaPessoa" NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "cliente_id" UUID,
    "eh_nosso_cliente" BOOLEAN NOT NULL DEFAULT false,
    "oab_numero" TEXT,
    "oab_uf" CHAR(2),
    "observacoes" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "partes_processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_membro" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "funcao_no_processo" TEXT,
    "responsavel_principal" BOOLEAN NOT NULL DEFAULT false,
    "acesso_permitido" "NivelAcessoProcesso" NOT NULL DEFAULT 'LEITURA_ESCRITA',
    "entrou_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ,

    CONSTRAINT "processo_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_relacionado" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_origem_id" UUID NOT NULL,
    "processo_relacionado_id" UUID NOT NULL,
    "tipo_relacao" "TipoRelacaoProcesso" NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processo_relacionado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazos" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoPrazo" NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "hora_vencimento" TIME,
    "data_conclusao" TIMESTAMPTZ,
    "responsavel_id" UUID NOT NULL,
    "prioridade" "PrioridadePrazo" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusPrazo" NOT NULL DEFAULT 'PENDENTE',
    "lembretes" INTEGER[] DEFAULT ARRAY[7, 3, 1, 0]::INTEGER[],
    "origem" "OrigemPrazo" NOT NULL DEFAULT 'MANUAL',
    "motivo_cancelamento" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prazos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastas" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID,
    "pasta_pai_id" UUID,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criada_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "pastas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID,
    "cliente_id" UUID,
    "pasta_id" UUID,
    "nome" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "extensao" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho_bytes" BIGINT NOT NULL,
    "storage_provider" "StorageProvider" NOT NULL DEFAULT 'S3',
    "storage_key" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "status_upload" "StatusUpload" NOT NULL DEFAULT 'PENDENTE',
    "status_processamento" "StatusProcessamentoDocumento" NOT NULL DEFAULT 'PENDENTE',
    "status_antivirus" "StatusAntivirus" NOT NULL DEFAULT 'PENDENTE',
    "categoria" TEXT,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OUTRO',
    "confidencialidade" "NivelConfidencialidade" NOT NULL DEFAULT 'PADRAO',
    "visibilidade" "Visibilidade" NOT NULL DEFAULT 'INTERNA',
    "descricao" TEXT,
    "versao_vigente_id" UUID,
    "autor_upload_id" UUID NOT NULL,
    "data_documento" DATE,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versoes_documento" (
    "id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "tamanho_bytes" BIGINT NOT NULL,
    "autor_id" UUID NOT NULL,
    "comentario_versao" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versoes_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_timeline" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "tipo" "TipoEventoTimeline" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_evento" TIMESTAMPTZ NOT NULL,
    "data_registro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" "OrigemEvento" NOT NULL DEFAULT 'MANUAL',
    "autor_id" UUID,
    "entidade_relacionada_tipo" TEXT,
    "entidade_relacionada_id" UUID,
    "visibilidade" "Visibilidade" NOT NULL DEFAULT 'INTERNA',
    "metadados" JSONB NOT NULL DEFAULT '{}',
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "eventos_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID,
    "documento_id" UUID,
    "timeline_evento_id" UUID,
    "autor_id" UUID NOT NULL,
    "conteudo" TEXT NOT NULL,
    "comentario_pai_id" UUID,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "visibilidade" "Visibilidade" NOT NULL DEFAULT 'INTERNA',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario_mencao" (
    "comentario_id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,

    CONSTRAINT "comentario_mencao_pkey" PRIMARY KEY ("comentario_id","membro_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,
    "excluido_em" TIMESTAMPTZ,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_tag" (
    "processo_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processo_tag_pkey" PRIMARY KEY ("processo_id","tag_id")
);

-- CreateTable
CREATE TABLE "documento_tag" (
    "documento_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_tag_pkey" PRIMARY KEY ("documento_id","tag_id")
);

-- CreateTable
CREATE TABLE "resumos_ia" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "solicitado_por_id" UUID NOT NULL,
    "tipo_resumo" "TipoResumoIA" NOT NULL DEFAULT 'GERAL',
    "versao_resumo" INTEGER NOT NULL,
    "status" "StatusResumoIA" NOT NULL DEFAULT 'PENDENTE',
    "conteudo" TEXT,
    "estrutura_json" JSONB,
    "modelo" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "tokens_entrada" INTEGER,
    "tokens_saida" INTEGER,
    "custo_estimado_centavos" INTEGER,
    "hash_contexto" TEXT NOT NULL,
    "latencia_ms" INTEGER,
    "erro" TEXT,
    "feedback" "FeedbackResumo",
    "comentario_feedback" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "gerado_em" TIMESTAMPTZ,
    "expira_em" TIMESTAMPTZ,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "resumos_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fontes_ia" (
    "id" UUID NOT NULL,
    "resumo_ia_id" UUID NOT NULL,
    "source_type" "TipoFonteIA" NOT NULL,
    "documento_id" UUID,
    "evento_timeline_id" UUID,
    "hash_fonte" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "trecho_ou_referencia" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fontes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "url_acao" TEXT,
    "entidade_relacionada_tipo" TEXT,
    "entidade_relacionada_id" UUID,
    "prioridade" "PrioridadeNotificacao" NOT NULL DEFAULT 'NORMAL',
    "lida_em" TIMESTAMPTZ,
    "arquivada_em" TIMESTAMPTZ,
    "canais_enviados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agrupamento_chave" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_notificacao" (
    "id" UUID NOT NULL,
    "membro_id" UUID NOT NULL,
    "tipo_notificacao" TEXT NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "frequencia" "FrequenciaNotificacao" NOT NULL DEFAULT 'IMEDIATA',

    CONSTRAINT "preferencias_notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID,
    "ator_id" UUID,
    "ator_tipo" "TipoAtor" NOT NULL DEFAULT 'USUARIO',
    "sessao_id" UUID,
    "acao" TEXT NOT NULL,
    "recurso_tipo" TEXT NOT NULL,
    "recurso_id" UUID,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "correlation_id" UUID NOT NULL,
    "resultado" "ResultadoAuditoria" NOT NULL,
    "motivo" TEXT,
    "metadados" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_outbox" (
    "id" UUID NOT NULL,
    "escritorio_id" UUID,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado_em" TIMESTAMPTZ,

    CONSTRAINT "eventos_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuarios_email" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "idx_user_identity_usuario" ON "user_identities"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_identity_provider_account" ON "user_identities"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "idx_token_recuperacao_usuario" ON "tokens_recuperacao_senha"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_token_recuperacao_senha" ON "tokens_recuperacao_senha"("token_hash");

-- CreateIndex
CREATE INDEX "idx_sessoes_usuario" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_sessoes_familia" ON "sessoes"("familia_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_escritorios_slug" ON "escritorios"("slug");

-- CreateIndex
CREATE INDEX "idx_papeis_escritorio" ON "papeis"("escritorio_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_permissoes_chave" ON "permissoes"("chave");

-- CreateIndex
CREATE INDEX "idx_membros_escritorio_status" ON "membros"("escritorio_id", "status");

-- CreateIndex
CREATE INDEX "idx_membros_papel" ON "membros"("papel_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_membros_usuario_escritorio" ON "membros"("usuario_id", "escritorio_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_permissao_usuario" ON "permissoes_usuario"("membro_id", "permissao_id");

-- CreateIndex
CREATE INDEX "idx_convites_escritorio_email_status" ON "convites"("escritorio_id", "email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_convites_token" ON "convites"("token_hash");

-- CreateIndex
CREATE INDEX "idx_clientes_escritorio_nome" ON "clientes"("escritorio_id", "nome");

-- CreateIndex
CREATE INDEX "idx_clientes_escritorio_cpf" ON "clientes"("escritorio_id", "cpf");

-- CreateIndex
CREATE INDEX "idx_clientes_escritorio_cnpj" ON "clientes"("escritorio_id", "cnpj");

-- CreateIndex
CREATE INDEX "idx_processos_escritorio_status" ON "processos"("escritorio_id", "status");

-- CreateIndex
CREATE INDEX "idx_processos_escritorio_responsavel" ON "processos"("escritorio_id", "responsavel_principal_id");

-- CreateIndex
CREATE INDEX "idx_processos_escritorio_atualizacao" ON "processos"("escritorio_id", "ultima_atualizacao_em" DESC);

-- CreateIndex
CREATE INDEX "idx_processos_cliente" ON "processos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_processos_escritorio_cnj" ON "processos"("escritorio_id", "numero_cnj");

-- CreateIndex
CREATE INDEX "idx_partes_processo" ON "partes_processo"("processo_id");

-- CreateIndex
CREATE INDEX "idx_processo_membro_processo" ON "processo_membro"("processo_id");

-- CreateIndex
CREATE INDEX "idx_processo_membro_membro" ON "processo_membro"("membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_processo_relacionado" ON "processo_relacionado"("processo_origem_id", "processo_relacionado_id", "tipo_relacao");

-- CreateIndex
CREATE INDEX "idx_prazos_escritorio_vencimento" ON "prazos"("escritorio_id", "data_vencimento");

-- CreateIndex
CREATE INDEX "idx_prazos_responsavel" ON "prazos"("responsavel_id", "data_vencimento");

-- CreateIndex
CREATE INDEX "idx_pastas_processo" ON "pastas"("processo_id");

-- CreateIndex
CREATE INDEX "idx_pastas_pai" ON "pastas"("pasta_pai_id");

-- CreateIndex
CREATE INDEX "idx_documentos_escritorio_processo" ON "documentos"("escritorio_id", "processo_id");

-- CreateIndex
CREATE INDEX "idx_documentos_pasta" ON "documentos"("pasta_id");

-- CreateIndex
CREATE INDEX "idx_documentos_hash" ON "documentos"("escritorio_id", "hash_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "uq_versoes_documento_numero" ON "versoes_documento"("documento_id", "numero");

-- CreateIndex
CREATE INDEX "idx_timeline_processo_data" ON "eventos_timeline"("processo_id", "data_evento" DESC);

-- CreateIndex
CREATE INDEX "idx_timeline_processo_tipo" ON "eventos_timeline"("processo_id", "tipo");

-- CreateIndex
CREATE INDEX "idx_comentarios_processo" ON "comentarios"("processo_id", "criado_em");

-- CreateIndex
CREATE INDEX "idx_comentarios_documento" ON "comentarios"("documento_id", "criado_em");

-- CreateIndex
CREATE INDEX "idx_resumos_ia_processo_tipo_vigente" ON "resumos_ia"("processo_id", "tipo_resumo", "vigente");

-- CreateIndex
CREATE INDEX "idx_resumos_ia_status" ON "resumos_ia"("status");

-- CreateIndex
CREATE INDEX "idx_fontes_ia_resumo" ON "fontes_ia"("resumo_ia_id", "ordem");

-- CreateIndex
CREATE INDEX "idx_notificacoes_destinatario" ON "notificacoes"("destinatario_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_preferencia_notificacao" ON "preferencias_notificacao"("membro_id", "tipo_notificacao");

-- CreateIndex
CREATE INDEX "idx_auditoria_escritorio_periodo" ON "log_auditoria"("escritorio_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_auditoria_recurso" ON "log_auditoria"("recurso_tipo", "recurso_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_auditoria_ator" ON "log_auditoria"("ator_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "idx_eventos_outbox_pendente" ON "eventos_outbox"("processado_em");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_escritorio_ativo_id_fkey" FOREIGN KEY ("escritorio_ativo_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papeis" ADD CONSTRAINT "papeis_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papel_permissao" ADD CONSTRAINT "papel_permissao_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papel_permissao" ADD CONSTRAINT "papel_permissao_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissoes_usuario" ADD CONSTRAINT "permissoes_usuario_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissoes_usuario" ADD CONSTRAINT "permissoes_usuario_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_convidado_por_id_fkey" FOREIGN KEY ("convidado_por_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_processo" ADD CONSTRAINT "partes_processo_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_membro" ADD CONSTRAINT "processo_membro_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_relacionado" ADD CONSTRAINT "processo_relacionado_processo_origem_id_fkey" FOREIGN KEY ("processo_origem_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_relacionado" ADD CONSTRAINT "processo_relacionado_processo_relacionado_id_fkey" FOREIGN KEY ("processo_relacionado_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastas" ADD CONSTRAINT "pastas_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastas" ADD CONSTRAINT "pastas_pasta_pai_id_fkey" FOREIGN KEY ("pasta_pai_id") REFERENCES "pastas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_pasta_id_fkey" FOREIGN KEY ("pasta_id") REFERENCES "pastas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_documento" ADD CONSTRAINT "versoes_documento_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_timeline_evento_id_fkey" FOREIGN KEY ("timeline_evento_id") REFERENCES "eventos_timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_comentario_pai_id_fkey" FOREIGN KEY ("comentario_pai_id") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_mencao" ADD CONSTRAINT "comentario_mencao_comentario_id_fkey" FOREIGN KEY ("comentario_id") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_tag" ADD CONSTRAINT "processo_tag_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_tag" ADD CONSTRAINT "processo_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_tag" ADD CONSTRAINT "documento_tag_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_tag" ADD CONSTRAINT "documento_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumos_ia" ADD CONSTRAINT "resumos_ia_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_resumo_ia_id_fkey" FOREIGN KEY ("resumo_ia_id") REFERENCES "resumos_ia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fontes_ia" ADD CONSTRAINT "fontes_ia_evento_timeline_id_fkey" FOREIGN KEY ("evento_timeline_id") REFERENCES "eventos_timeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

