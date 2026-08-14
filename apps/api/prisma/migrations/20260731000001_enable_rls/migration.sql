-- ============================================================================
-- Row-Level Security — terceira camada de isolamento multi-tenant
-- Reafirma docs/database/01-estrategia-multitenancy.md §1.7,
-- docs/backend-implementation/03-multitenancy.md e PROMPT 5C Etapa 2.
--
-- ATENÇÃO — pré-requisito operacional que esta migration NÃO cria:
-- RLS é ignorada automaticamente para o DONO da tabela (table owner) e para
-- roles com atributo BYPASSRLS (ex.: superusers), mesmo com
-- FORCE ROW LEVEL SECURITY. Se a aplicação conectar com o mesmo usuário que
-- rodou `prisma migrate deploy` (tipicamente o dono das tabelas), TODA a
-- RLS abaixo é um no-op silencioso. É obrigatório criar uma role de runtime
-- separada (ex. `app_runtime`), sem BYPASSRLS e sem ser dona das tabelas, e
-- apontar `DATABASE_URL` da aplicação para ela — migrations continuam
-- rodando com a role de owner/migração. Isso NÃO foi testado neste ambiente
-- (sem Postgres real disponível) — ver docs/backend-implementation/19-decisions.md.
--
-- Convenção de contexto: `app.tenant_id` é setado via
-- `SET LOCAL` / `set_config(..., true)` dentro da MESMA transação da query,
-- nunca por conexão persistente (compatível com PgBouncer em transaction
-- pooling) — já implementado em
-- shared/infrastructure/database/prisma.service.ts (`runInTenantTransaction`).
-- `current_setting('app.tenant_id', true)` com o segundo argumento `true`
-- retorna NULL (em vez de lançar erro) quando a variável não foi setada —
-- por isso o predicado usa `= current_setting(...)::uuid`, que é FALSE
-- (nunca TRUE) quando o contexto está ausente: ausência de contexto bloqueia
-- a operação por padrão, não abre exceção.

-- ----------------------------------------------------------------------------
-- 1. Tabelas com escritorio_id direto (mesmo conjunto de
--    TENANT_SCOPED_MODELS em shared/infrastructure/database/tenant-scoped.extension.ts)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'membros', 'convites', 'equipes', 'clientes', 'processos',
    'partes_processo', 'prazos', 'processo_relacionado', 'documentos',
    'pastas', 'eventos_timeline', 'comentarios', 'tags', 'resumos_ia',
    'notificacoes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabela);

    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)',
      tabela
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)',
      tabela
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)',
      tabela
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (escritorio_id = current_setting(''app.tenant_id'', true)::uuid)',
      tabela
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. escritorios — não tem escritorio_id (é o próprio tenant); isolamento é
--    por id. Bootstrap (registro/aceite de convite, ver
--    docs/backend-implementation/19-decisions.md §19.3) roda com a role de
--    migração/bootstrap, não a de runtime — ver seção 4 abaixo.
-- ----------------------------------------------------------------------------

ALTER TABLE escritorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE escritorios FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON escritorios
  FOR SELECT USING (id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_update ON escritorios
  FOR UPDATE USING (id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);

-- ----------------------------------------------------------------------------
-- 3. Tabelas satélite sem escritorio_id próprio — isolamento via EXISTS
--    contra o agregado pai. Reafirma o comentário em
--    tenant-scoped.extension.ts ("protegidos transitivamente pela FK
--    composta para o agregado pai"), agora também como garantia de banco,
--    não só de aplicação.
-- ----------------------------------------------------------------------------

ALTER TABLE processo_membro ENABLE ROW LEVEL SECURITY;
ALTER TABLE processo_membro FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON processo_membro
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_membro.processo_id
        AND p.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE versoes_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE versoes_documento FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON versoes_documento
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documentos d
      WHERE d.id = versoes_documento.documento_id
        AND d.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE comentario_mencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentario_mencao FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON comentario_mencao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM comentarios c
      WHERE c.id = comentario_mencao.comentario_id
        AND c.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE processo_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE processo_tag FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON processo_tag
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_tag.processo_id
        AND p.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE documento_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_tag FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON documento_tag
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documentos d
      WHERE d.id = documento_tag.documento_id
        AND d.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE fontes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fontes_ia FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_all ON fontes_ia
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM resumos_ia r
      WHERE r.id = fontes_ia.resumo_ia_id
        AND r.escritorio_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- ----------------------------------------------------------------------------
-- 4. log_auditoria — RLS por escritorio_id (nullable: eventos de sistema
--    pré-tenant, ex. falha de login, têm escritorio_id NULL e são visíveis
--    apenas à role de auditoria/administração, nunca via runtime de tenant).
--    Reafirma docs/backend-implementation/19-decisions.md §19.10.
-- ----------------------------------------------------------------------------

ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON log_auditoria
  FOR SELECT USING (escritorio_id = current_setting('app.tenant_id', true)::uuid);
-- Sem policy de UPDATE/DELETE definida: nenhuma role de runtime tem
-- permissão de escrita para essas operações (ver GRANT abaixo) — a ausência
-- de policy nessas operações combinada com FORCE RLS nega tudo por padrão.
CREATE POLICY tenant_isolation_insert ON log_auditoria
  FOR INSERT WITH CHECK (
    escritorio_id IS NULL OR escritorio_id = current_setting('app.tenant_id', true)::uuid
  );

-- Imutabilidade de fato: mesmo que uma policy de UPDATE/DELETE seja
-- adicionada por engano no futuro, a role de aplicação não deve ter o
-- privilégio de banco para essas operações nesta tabela. Assume a existência
-- da role `app_runtime` (ver nota no topo do arquivo) — comando é
-- best-effort (não falha a migration se a role ainda não existir neste
-- ambiente, mas deve ser revisado antes de ir para produção).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON log_auditoria FROM app_runtime';
  END IF;
END $$;
