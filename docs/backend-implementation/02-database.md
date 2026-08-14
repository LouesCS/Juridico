# 02 — Banco de Dados

## Implementado

`apps/api/prisma/schema.prisma` — **completo para a Fase 1**, validado com
`npx prisma validate` e gerado com `npx prisma generate` (Prisma Client
funcional em `node_modules/@prisma/client`).

25 modelos, cobrindo integralmente `docs/database/03` a `06`: `Usuario`,
`UserIdentity`, `Sessao`, `TokenRecuperacaoSenha`, `Escritorio`, `Papel`,
`Permissao`, `PapelPermissao`, `Equipe`, `Membro`, `PermissaoUsuario`,
`Convite`, `Cliente`, `Processo`, `ParteProcesso`, `ProcessoMembro`,
`ProcessoRelacionado`, `Prazo`, `Pasta`, `Documento`, `VersaoDocumento`,
`EventoTimeline`, `Comentario`, `ComentarioMencao`, `Tag`, `ProcessoTag`,
`DocumentoTag`, `ResumoIA`, `FonteIA`, `Notificacao`,
`PreferenciaNotificacao`, `LogAuditoria`, `EventoOutbox`.

Convenções aplicadas: `snake_case` via `@map`/`@@map`, UUID (v4 via
`@default(uuid())` — ver pendência de UUIDv7 abaixo), soft delete
(`excluidoEm`), versionamento otimista (`versao` em `Processo`/`Documento`),
enums nativos para conjuntos fechados, `Json` para metadados polimórficos.

## PROMPT 5C, Etapa 3 — migrations reais geradas (não aplicadas)

Três migrations criadas em `apps/api/prisma/migrations/`, todas geradas ou
escritas **sem exigir um Postgres ativo** (`prisma migrate diff` roda contra
o schema em memória, não uma conexão real):

1. **`20260731000000_init`** — gerada com
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   (1003 linhas): todas as tabelas, enums, índices, uniques (incluindo
   parciais/compostos) e constraints já declaradas em `schema.prisma`. Este
   comando **não precisa de banco** — diffa contra um estado vazio, não uma
   conexão — por isso pôde ser gerado de verdade neste ambiente.
2. **`20260731000001_enable_rls`** — SQL manual (RLS), ver
   [03-multitenancy.md](03-multitenancy.md).
3. **`20260731000002_search_extensions`** — SQL manual: `CREATE EXTENSION
   pg_trgm`/`unaccent`, colunas `tsvector` geradas (`GENERATED ALWAYS ...
   STORED`) em `clientes`/`processos`/`documentos`/`tags`/`comentarios` +
   índices GIN, coluna `numero_cnj_somente_digitos` (regexp, trigram) em
   `processos` — reafirma `docs/database/09-indices-busca-performance.md §9.3`.
   As colunas geradas foram também declaradas em `schema.prisma` como
   `Unsupported("tsvector")` (ou `String?` para a de dígitos) especificamente
   para que um futuro `prisma migrate dev` não as veja como drift e tente
   removê-las — só a migration manual define a expressão `GENERATED ALWAYS`.

**`migration_lock.toml`** criado manualmente (`provider = "postgresql"`),
exigido pelo Prisma para reconhecer a pasta `migrations/`.

**Verificado de fato:** `prisma validate`/`generate` com os novos campos
`Unsupported`, `tsc --noEmit`, `eslint`, `nest build`, `jest` (38/38) — todos
voltaram a passar depois da mudança de schema. **Não verificado:** as 3
migrations nunca rodaram contra um Postgres real (`prisma migrate deploy`
nunca foi executado) — a única verificação possível foi sanidade estrutural
manual do SQL (parênteses/blocos `$$` balanceados; um parser SQL genérico
testado — `node-sql-parser` — não entende blocos `DO $$` do PL/pgSQL e foi
descartado). Ver [17-tests.md](17-tests.md) para o ambiente de teste
(Testcontainers) que aplicaria e exercitaria estas migrations quando houver
Docker disponível.

## Não implementado / pendente

- **Migrations aplicadas contra Postgres real** (`prisma migrate deploy`) —
  escritas, nunca rodadas.
- **UUIDv7**: o schema usa `@default(uuid())` (UUID v4) por simplicidade —
  a modelagem oficial (`docs/database/02-convencoes-dados.md §2.3`) recomenda
  UUIDv7 gerado na aplicação. Ajuste pendente: trocar para geração explícita
  via biblioteca `uuidv7` (já está em `package.json`) em vez do default do
  Prisma, sem migração de dado necessária (é só troca de como o valor é
  gerado, o tipo de coluna não muda).
- **Roles de banco reais** (`app_runtime`/`app_migration`) — a migration de
  RLS assume a existência de `app_runtime` para o `REVOKE` de
  `log_auditoria`, mas não a cria; provisionamento de role é infraestrutura,
  não schema.
- **Particionamento de `log_auditoria`, triggers de normalização de e-mail,
  `documentos.texto_extraido`** — não incluídos (divergência de
  `texto_extraido` registrada na própria migration de search).
- **`pgvector`/`Embedding`/`IndiceBusca`** — não incluídos no schema; ficam
  para quando os módulos `AI`/`Search` forem implementados.

---

**Anterior:** [01-bootstrap.md](01-bootstrap.md) · **Próximo:** [03-multitenancy.md](03-multitenancy.md)
