# 05 — Autenticação (Implementação NestJS)

> Contrato já fechado em [../api/02-autenticacao.md](../api/02-autenticacao.md)
> e [../api/04-identity.md](../api/04-identity.md). Aqui: como isso é
> implementado com Passport/NestJS.

## 5.1 Estratégias Passport (`common/strategies/`)

| Strategy | Tipo | Usa |
|---|---|---|
| `LocalStrategy` | `passport-local` | `POST /v1/auth/login` — valida e-mail/senha (Argon2id) |
| `JwtStrategy` | `passport-jwt` | Todo endpoint protegido — valida access token, popula `request.user` |
| `JwtRefreshStrategy` | `passport-jwt` (extrator customizado do cookie) | `POST /v1/auth/refresh` — valida refresh token, checa denylist |
| `GoogleStrategy` | `passport-google-oauth20` | `GET /v1/auth/google/callback` |
| `MicrosoftStrategy` | `passport-microsoft` (ou OIDC genérico) | `GET /v1/auth/microsoft/callback` |

Cada strategy é registrada uma única vez em `IdentityModule`, nunca
duplicada por outro módulo — qualquer módulo que precise do usuário
autenticado usa o `JwtAuthGuard` global (§5.3), não uma strategy própria.

## 5.2 Emissão e verificação de token

`shared/infrastructure/security/token.service.ts` — responsável por assinar
(RS256, chave privada em Secret Manager, nunca em variável de ambiente
plana) e verificar tokens. Rotação de chave suportada via `kid` no header
(reafirma [../api/21-seguranca.md §21.1](../api/21-seguranca.md)) —
`TokenService` mantém um mapa de chaves públicas por `kid` para validar
tokens emitidos antes de uma rotação.

## 5.3 Guards (`common/guards/`)

| Guard | Ordem | Responsabilidade |
|---|---|---|
| `JwtAuthGuard` | 1º (global, via `APP_GUARD`) | Valida assinatura + expiração do access token; popula `request.user` |
| `TenantGuard` | 2º | Extrai `tenantId`/`membroId` da claim, popula `AsyncLocalStorage` (reafirma [../database/01-estrategia-multitenancy.md §1.4](../database/01-estrategia-multitenancy.md)) |
| `PermissionGuard` | 3º, por rota (`@RequirePermission(...)`) | Verifica se `request.user.permissions` contém a permissão declarada |
| `ThrottleGuard` | Global | Rate limit por tenant/usuário/IP (reafirma [../api/01-convencoes.md §1.12](../api/01-convencoes.md)) |

Rotas públicas (login, register, callback OAuth, aceite de convite) usam
`@Public()` decorator para pular `JwtAuthGuard`/`TenantGuard` — decorator
explícito, nunca ausência silenciosa de guard (uma rota sem `@Public()` e
sem token é rejeitada por padrão — **negar por padrão**, reafirma
[../database/09-seguranca-lgpd.md §9.3](../09-seguranca-lgpd.md)).

## 5.4 Sessão e denylist

`SessionService` (em `Identity`) gerencia `Sessao` no Postgres e o denylist
de `sessionId` revogado no Redis (TTL igual ao do access token, reafirma
[../05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md)).
`JwtStrategy.validate()` consulta o denylist a cada requisição — é a única
leitura Redis obrigatória no caminho crítico de toda requisição autenticada,
aceita conscientemente pelo ganho de revogação em tempo real.

## 5.5 MFA

`MfaService` (TOTP, biblioteca `otplib`) — `mfaSegredo` armazenado
criptografado (AES-256-GCM) via `shared/infrastructure/security/crypto.service.ts`,
chave gerenciada em KMS/Secret Manager, nunca a mesma chave de assinatura de
JWT.

## 5.6 OAuth

`GoogleStrategy`/`MicrosoftStrategy` implementam `validate(profile)` que
delega a `VincularOuCriarIdentidadeUseCase` (em `Identity`) — a lógica de
"vincular a usuário existente só se e-mail verificado" (reafirma
[../api/02-autenticacao.md §2.5](../api/02-autenticacao.md)) vive no use
case, não na strategy (strategy só extrai o perfil do provedor).

## 5.7 SSE — cookie httpOnly (implementação da decisão já tomada)

Reafirma decisão e justificativa completas em
[../api/02-autenticacao.md §2.9](../api/02-autenticacao.md) — aqui, apenas o
ponto de implementação: os dois controllers de streaming
(`AiController.stream`, `NotificationsController.stream`) são anotados com
`@UseGuards(JwtAuthGuard)` normalmente (o guard lê o cookie httpOnly via o
mesmo `JwtStrategy`, configurado para extrair token de
`request.cookies.access_token` quando o header `Authorization` está ausente)
— nenhum guard ou strategy especial para SSE, reaproveita a infraestrutura
de autenticação padrão.

---

**Anterior:** [04-dependencias.md](04-dependencias.md) · **Próximo:** [06-autorizacao.md](06-autorizacao.md)
