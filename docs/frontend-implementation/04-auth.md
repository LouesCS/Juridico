# 04 — Autenticação

## Implementado e testado

**Schemas** (`features/auth/schemas/auth.schemas.ts`) — `loginSchema`,
`registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, espelhando
campo a campo os schemas Zod reais do backend
(`apps/api/src/modules/identity/presentation/schemas/identity.schemas.ts`),
com mensagens em português.

**API** (`features/auth/api/`) — `auth.api.ts` (register/login/logout/me/
requestPasswordRecovery/resetPassword), `keys.ts` (`authKeys.me()` —
único caso não escopado por `officeId` nesta rodada, ver
[19-decisions.md §19.3](19-decisions.md)), `queries.ts` (`useCurrentUser`),
`mutations.ts` (`useLogin`, `useRegister`, `useLogout`,
`useRequestPasswordRecovery`, `useResetPassword`).

**Componentes** — `LoginForm` (com "lembrar de mim", mapeamento de
`INVALID_CREDENTIALS`/`ACCOUNT_LOCKED`, redirecionamento seguro via `next`
validado contra open redirect), `RegisterForm` (mapeamento de
`EMAIL_ALREADY_EXISTS` + `fieldErrors` genérico, sucesso mostra mensagem
inline "verifique seu e-mail" sem login automático), `ForgotPasswordForm`
(sempre a mesma mensagem de sucesso, anti-enumeração), `ResetPasswordForm`
(confirmação de senha, tratamento de token inválido/expirado).

**Rotas** — `/login`, `/registro`, `/esqueci-senha`,
`/redefinir-senha/[token]`, todas dentro de `(public)/layout.tsx`.

**`middleware.ts`** — checagem de presença do cookie `access_token`
(nunca validação de assinatura, reafirma `docs/frontend/05-autenticacao.md
§5.2`), redireciona para `/login?next=<rota>` preservando a rota original.

## Verificado de fato

- **3 testes de componente reais** em `login-form.spec.tsx`: validação de
  campos obrigatórios, login bem-sucedido + redirecionamento, credenciais
  inválidas + mensagem sem detalhe técnico — usando MSW real
  (`mocks/handlers/identity.ts`), não mock de função.
- `next dev` real + `curl`: as 4 rotas renderizam HTML correto; `/`
  (protegida) redireciona `307` para `/login?next=%2F`.
- `npx tsc --noEmit`, `npx eslint`, `npx next build` — todos passando com
  este código incluído.

## Correção real nesta rodada (Prompt 6C)

`CurrentUserDTO` (`auth.api.ts`) era um formato plano inventado
(`{ usuarioId, nome, email, ... }`), nunca validado contra
`get-current-user.use-case.ts` real, que retorna um formato aninhado
(`{ usuario, membro, escritorio }`). Descoberto ao implementar o Office
Context (Etapa 6), que depende diretamente da forma de `GET /me`.
Corrigido no tipo, no handler MSW, e nos dois consumidores existentes na
época (`(app)/page.tsx`, novo `UserMenu`) — registrado em
[19-decisions.md §19.7](19-decisions.md). `useLogin`/`useLogout` também
passaram a sincronizar `stores/office.store.ts` (hidratar a lista de
escritórios no login, resetar no logout) — ver
[05-office-context.md](05-office-context.md).

## Não implementado / pendente

- **Nenhuma chamada foi feita contra o backend real** (sem Postgres) —
  todo teste/verificação usou MSW ou apenas renderização estática.
- **Múltiplas sessões** — `GET /auth/sessions`/`DELETE /auth/sessions/:id`
  ainda não têm tela nenhuma consumindo (Etapa 10, Users/Profile).
- **Verificação de e-mail, MFA, OAuth Google/Microsoft** — sem UI nesta
  rodada; nenhum dos três tem endpoint real no backend
  (`docs/backend-implementation/20-context-next-step.md`).
- Troca de escritório e `BroadcastChannel` entre abas **agora
  implementados** — ver [05-office-context.md](05-office-context.md)
  (eram a pendência listada aqui antes desta rodada).

---

**Anterior:** [03-http-openapi.md](03-http-openapi.md) · **Próximo:** [05-office-context.md](05-office-context.md)
