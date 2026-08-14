# 09 — Users e Profile

## Implementado e testado

`src/app/(app)/perfil/page.tsx` renderiza `features/profile`
(`ProfilePage`), substituindo o stub de navegação. Backend real do módulo
Users **não existe** (`docs/backend-implementation/00-status.md`), mas
Identity expõe endpoints reais de conta que cobrem parte do escopo desta
etapa (`change-password.use-case.ts`, `list-sessions.use-case.ts`,
`revoke-session.use-case.ts`), consumidos aqui.

```text
src/features/profile/
  api/{profile.api.ts, keys.ts, queries.ts, mutations.ts}
  schemas/profile.schemas.ts
  components/{profile-overview, change-password-form, sessions-list, profile-page}.tsx
  index.ts
```

**Endpoints reais usados:** `GET /me` (reaproveitado de `features/auth`),
`POST /me/password`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`.

## Funcionalidades implementadas

- Aba **Perfil**: leitura de nome, sobrenome, e-mail, papel, escritório,
  idioma e tema — tudo vindo de `GET /me`, **somente leitura**.
- Aba **Segurança**: troca de senha (RHF + Zod, mapeia `INVALID_CREDENTIALS`
  para o campo "senha atual" e `422`/`fieldErrors` genericamente); lista de
  sessões ativas com dispositivo/IP/último uso, badge "Sessão atual",
  encerramento individual de outra sessão com `ConfirmDialog`.
- Separação global vs. escritório: `profileKeys.sessions()` **não** é
  escopado por `officeId` (dado de conta, não de tenant) — mesma exceção
  já registrada para `authKeys.me()` (§19.3), aplicada de novo aqui
  deliberadamente, não uma inconsistência.

## Gaps reais de backend — estado de indisponibilidade, nunca simulado

| Recurso pedido | Por que não foi construído |
|---|---|
| Editar nome/foto/telefone/idioma/tema | `identity.controller.ts` não tem `PATCH /me` — só `GET /me` e `POST /me/password`. Mostrado como alerta explícito na aba Perfil, não como formulário desabilitado (não existe formulário algum) |
| "Encerrar todas as sessões" | `RevokeSessionUseCase.executeAllExceptCurrent` existe no código do backend mas **nenhuma rota do controller o chama** — botão presente, desabilitado, com `Tooltip` explicando o motivo |
| MFA | Sem endpoint real (`docs/backend-implementation/00-status.md`) — aviso de indisponibilidade na aba Segurança |
| OAuth (Google/Microsoft) | Idem |
| Preferências específicas do escritório (distintas de preferências globais do usuário) | Não há endpoint de preferências por membro/escritório; `idioma`/`tema` de `GET /me` são só globais do usuário mesmo — nada foi inventado para simular a distinção |

## Testes reais

10 testes novos: dados reais exibidos (nome, e-mail, papel, escritório),
aviso de indisponibilidade de edição, validação de senha (curta/
divergente), erro 422 mapeado, senha atual incorreta mapeada ao campo,
sucesso limpa o formulário, listagem de sessões com sessão atual
marcada, ausência de ação de encerrar para a própria sessão atual,
revogação de outra sessão, botão "encerrar todas" desabilitado, aviso de
MFA/OAuth indisponível.

---

**Anterior:** [08-dashboard.md](08-dashboard.md) · **Próximo:** [10-clients.md](10-clients.md)
