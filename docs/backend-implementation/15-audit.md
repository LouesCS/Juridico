# 15 — Audit

## Implementado e executado (PROMPT 5C, Etapa 1)

**Módulo `apps/api/src/modules/audit/`:**

- `application/audit.service.ts` — `AuditService.registrar(entry)`. Grava em
  `LogAuditoria` via `PrismaService.client` (este modelo não é tenant-scoped
  nem soft-delete — grava mesmo sem `TenantContext` ativo, necessário para
  eventos pré-autenticação como falha de login). **Nunca lança** — uma falha
  ao gravar o log é apenas logada via `Logger`, nunca derruba a operação de
  negócio auditada.
- `application/sanitize-for-audit.ts` — remove recursivamente (objetos e
  arrays aninhados) qualquer chave que combine com o padrão
  `/senha|password|token|refresh|cookie|secret|segredo|codigoRecuperacao/i`,
  substituindo o valor por `'[redacted]'`. Aplicado a `dadosAntes`/
  `dadosDepois` dentro do `AuditService`; o `AuditInterceptor` aplica a mesma
  função separadamente ao corpo da requisição antes de guardá-lo em
  `metadados.body`.
- `audit-action.decorator.ts` — `@Audit(acao, recursoTipo)`, metadado lido
  pelo interceptor. Rotas sem este decorator não geram log — auditoria é
  opt-in por rota, não global.
- `audit.interceptor.ts` — `AuditInterceptor`, registrado globalmente via
  `APP_INTERCEPTOR` em `app.module.ts`. Em sucesso, grava `resultado:
  SUCESSO` com `dadosDepois` = corpo da resposta; em falha, captura via
  `catchError` (funciona porque todo controller já lança `DomainError`
  uniformemente — `if (!result.ok) throw result.error`), grava `resultado:
  FALHA` (ou `NEGADO` quando o código é `FORBIDDEN`) com `motivo` = mensagem
  do erro (ou `error.meta.motivo`, usado para distinguir "reuso de refresh
  token" sem precisar de um novo código de erro). Ator, sessão e escritório
  vêm de `req.authUser` quando autenticado, ou são inferidos do corpo da
  resposta (`usuario.id`, `escritorio.id`, `escritorioAtivoId`) para rotas
  públicas como registro e login.
- `audit.module.ts` — expõe `AuditService`; o interceptor é provido
  separadamente em `AppModule` (precisa do `AuditService` já resolvido pelo
  container raiz).

**Aplicado aos módulos existentes** (decorator `@Audit(...)` adicionado a
cada handler, sem alterar a lógica de negócio):

| Módulo | Ações auditadas |
|---|---|
| Identity | `REGISTER`, `LOGIN` (sucesso e falha, mesmo `acao`, `resultado` diferente), `REFRESH` (inclui reuso de token via `motivo=REUSO_DETECTADO`), `SWITCH_OFFICE`, `LOGOUT`, `REVOKE_SESSION`, `CHANGE_PASSWORD`, `PASSWORD_RECOVERY_REQUEST`, `PASSWORD_RESET` |
| Offices | `UPDATE_OFFICE`, `DELETE_OFFICE` |
| Memberships | `INVITE_MEMBER`, `ACCEPT_INVITATION`, `UPDATE_MEMBER_ROLE`, `REMOVE_MEMBER`, `REVOKE_INVITATION` |

Isso cobre todos os itens da lista mínima obrigatória do PROMPT 5C Etapa 1
("cadastro, login, falha de login, logout, refresh, reutilização de refresh
token, alteração de senha, recuperação de senha, redefinição de senha, troca
de escritório, criação de escritório" [criado dentro do próprio `REGISTER`],
"convite, aceite de convite, alteração de papel, remoção de membro, revogação
de sessão").

**Dados sensíveis não gravados** (verificado por teste): `senha`,
`senhaHash`, `token`, `refreshToken`, `accessToken`, `cookie`, `secret`,
`tokenConvite` — redigidos para `'[redacted]'` antes de qualquer gravação.

**Testes criados e executados de verdade** (`npx jest`, neste ambiente):

- `sanitize-for-audit.spec.ts` — 5 testes (redação simples, redação
  recursiva em objeto/array aninhado, não lança para `null`/`undefined`/
  primitivo, converte `Date` para ISO string).
- `audit.service.spec.ts` — 3 testes (grava campos e sanitiza,
  preenche ausentes com `null`/`{}`, **nunca lança quando a gravação
  falha** — mocka rejeição do Prisma e confirma que `registrar()` resolve
  normalmente).
- `audit.interceptor.spec.ts` — 5 testes (passthrough sem `@Audit`, sucesso
  grava `SUCESSO` com ator/escritório extraídos do response, falha
  `DomainError` grava `FALHA` e repropaga o erro, `FORBIDDEN` grava
  `NEGADO`, `error.meta.motivo` é usado como motivo quando presente).

Suíte completa: **38/38 testes passando** (26 anteriores + 13 novos deste
módulo, incluídos build/typecheck/lint limpos) — todos executados de fato
neste ambiente, não projetados.

## Limitações explícitas desta etapa

- **Imutabilidade a nível de banco não aplicada.** O `REVOKE UPDATE/DELETE`
  na role de aplicação Postgres (`log_auditoria` append-only de verdade,
  não só por convenção de código) depende da migration de RLS/permissões —
  ver [19-decisions.md §19.9](19-decisions.md). Hoje a imutabilidade é só
  "nenhum código do domínio chama update/delete nessa tabela", não uma
  garantia de banco.
- **Captura de `dadosAntes` é parcial.** O interceptor captura `dadosDepois`
  genericamente (corpo da resposta), mas `dadosAntes` — o estado do recurso
  antes da mutação — exigiria uma leitura extra antes de cada operação
  decorada; não implementado nesta rodada (nenhuma chamada usa esse campo
  ainda, ele existe no schema e no `AuditEntry` para uso futuro).
- **Endpoints de consulta** (`GET /audit`) continuam não implementados.
- **Testes de integração contra Postgres real** (gravação de fato na
  tabela, não mock) não executáveis neste ambiente — ver limitação geral em
  [17-tests.md](17-tests.md).

---

**Anterior:** [14-ai.md](14-ai.md) · **Próximo:** [16-observability.md](16-observability.md)
