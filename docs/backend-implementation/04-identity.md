# 04 — Identity

## Implementado (endpoints reais, com use case + controller + DTO Zod)

| Endpoint | Use case | Testado |
|---|---|---|
| `POST /api/v1/auth/register` | `RegisterUseCase` | ✅ 3 cenários |
| `POST /api/v1/auth/login` | `LoginUseCase` | ✅ 5 cenários (inclui resolução NEGAR/CONCEDER) |
| `POST /api/v1/auth/refresh` | `RefreshTokenUseCase` | ⚠️ Não testado nesta rodada |
| `POST /api/v1/auth/switch-office` | `SwitchOfficeUseCase` | ⚠️ Não testado |
| `POST /api/v1/auth/logout` | `LogoutUseCase` | ⚠️ Não testado |
| `GET /api/v1/me` | `GetCurrentUserUseCase` | ⚠️ Não testado |
| `GET /api/v1/auth/sessions` | `ListSessionsUseCase` | ⚠️ Não testado |
| `DELETE /api/v1/auth/sessions/:id` | `RevokeSessionUseCase` | ⚠️ Não testado |
| `POST /api/v1/me/password` | `ChangePasswordUseCase` | ⚠️ Não testado |
| `POST /api/v1/auth/password-recovery` | `RequestPasswordRecoveryUseCase` | ⚠️ Não testado |
| `POST /api/v1/auth/password-reset` | `ResetPasswordUseCase` | ⚠️ Não testado |

Todos compilam, passam no typecheck e são exercitados pelo build — "não
testado" significa sem `.spec.ts` dedicado, não "não funcional"; a lógica de
`Login`/`Register` (os dois mais críticos) tem cobertura real.

Segurança implementada de fato: Argon2id (`PasswordService`), JWT RS256 com
`kid` e par de chaves efêmero em dev (`TokenService`), refresh rotativo com
detecção de reuso (`RefreshTokenUseCase`), hash de token (SHA-256, nunca
texto claro), denylist de sessão via Redis, mensagens de erro genéricas em
login (sem enumeração), custo computacional equalizado (hash falso quando
usuário não existe).

## Não implementado / pendente

- **MFA (TOTP)** — endpoints `POST /me/mfa/*` do contrato oficial não foram
  escritos nesta rodada.
- **OAuth Google/Microsoft** — estratégias Passport não implementadas
  (exigem client id/secret reais para qualquer teste significativo).
- **Verificação de e-mail** (`POST /auth/verify-email`) — o token é gerado
  no registro (`randomUUID()` solto, ver nota abaixo) mas não há endpoint
  para consumi-lo nem tabela dedicada — inconsistente com o padrão usado
  para recuperação de senha (`TokenRecuperacaoSenha`). **Corrigir na próxima
  rodada:** criar `TokenVerificacaoEmail` (mesmo padrão de hash) e o
  endpoint `POST /auth/verify-email`.

---

**Anterior:** [03-multitenancy.md](03-multitenancy.md) · **Próximo:** [05-offices-memberships.md](05-offices-memberships.md)
