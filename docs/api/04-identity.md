# 04 — Identity (Endpoints)

> Mecanismo em [02-autenticacao.md](02-autenticacao.md). Entidades em
> [../database/03-entidades-identidade-escritorios.md](../database/03-entidades-identidade-escritorios.md).

## 4.1 `POST /v1/auth/register`

**Objetivo:** cadastrar usuário + criar o primeiro escritório (fluxo de
onboarding, reafirma [../ux/03-user-journeys.md §3.1](../ux/03-user-journeys.md)).
**Permissão:** pública.
**Body:**
```json
{ "nome": "Ricardo", "sobrenome": "Almeida", "email": "ricardo@escritorio.com.br",
  "senha": "********", "nomeEscritorio": "Almeida Advogados" }
```
**Resposta 201:**
```json
{ "usuario": { "id": "...", "email": "..." }, "escritorio": { "id": "...", "slug": "almeida-advogados" } }
```
**Erros:** `409` (`code: EMAIL_ALREADY_EXISTS`, mensagem genérica — reafirma
[../database/12-eventos-fluxos-regras.md §12.3.1](../database/12-eventos-fluxos-regras.md)) ·
`422` (senha fora da política).
**Regras:** cria `Usuario` (status `PENDENTE`) + `Escritorio` (status `TRIAL`)
+ `Membro` (papel `OWNER`) em transação única; dispara e-mail de verificação.
**Idempotência:** `Idempotency-Key` obrigatório.

## 4.2 `POST /v1/auth/verify-email`

**Body:** `{ "token": "..." }`. **Resposta 200:** confirma verificação.
**Erros:** `400` (token inválido/expirado).

## 4.3 `POST /v1/auth/login`

**Permissão:** pública. **Body:** `{ "email": "...", "senha": "..." }`.
**Resposta 200 (sem MFA):**
```json
{ "usuario": {"id":"...","nome":"..."}, "escritorios": [{"id":"...","nome":"...","papel":"SOCIO"}] }
```
Tokens são setados via `Set-Cookie` (httpOnly) — nunca retornados no corpo.
**Resposta 202 (MFA pendente):** `{ "mfaChallengeToken": "...", "code": "MFA_REQUIRED" }`.
**Erros:** `401` (`code: INVALID_CREDENTIALS`, mensagem idêntica para e-mail
inexistente ou senha errada) · `429` (rate limit de tentativas) ·
`403` (`code: ACCOUNT_LOCKED` após 5 tentativas).
**Regras:** rate limit progressivo (5 tentativas → captcha → bloqueio de 15
min), reafirma [../09-seguranca-lgpd.md §9.2](../09-seguranca-lgpd.md).

## 4.4 `POST /v1/auth/mfa/verify`

**Body:** `{ "mfaChallengeToken": "...", "codigo": "123456" }`. **Resposta
200:** idêntica ao login bem-sucedido. **Erros:** `401` (código inválido),
`410` (challenge expirado, 5 min).

## 4.5 `GET /v1/auth/google` · `GET /v1/auth/google/callback` · equivalentes `/microsoft`

Ver fluxo completo em [02-autenticacao.md §2.5](02-autenticacao.md).
**Permissão:** pública. **Resposta:** redirecionamento 302.

## 4.6 `POST /v1/auth/refresh`

**Permissão:** cookie de refresh válido (sem `Authorization`). **Resposta
200:** novos cookies. **Erros:** `401` (`code: SESSION_REVOKED` ou
`code: SESSION_EXPIRED`).

## 4.7 `POST /v1/auth/switch-office`

> Endpoint identificado como pendência em
> [../ux/20-contexto-proxima-etapa.md](../ux/20-contexto-proxima-etapa.md),
> contratado aqui.

**Objetivo:** trocar o escritório ativo da sessão sem novo login completo.
**Permissão:** autenticado, deve ter `Membro` ativo no escritório de destino.
**Body:** `{ "escritorioId": "..." }`. **Resposta 200:** novos tokens com
`tenantId`/`roles`/`permissions` do novo escritório; `Sessao.escritorioAtivoId`
atualizado. **Erros:** `403` (`code: NOT_A_MEMBER`) se o usuário não tem
vínculo ativo naquele escritório. **Regra:** o token anterior é invalidado
(não apenas substituído) — reafirma
[../database/01-estrategia-multitenancy.md §1.9](../database/01-estrategia-multitenancy.md).

## 4.8 `POST /v1/auth/logout`

**Resposta 204.** Revoga a `Sessao` corrente (denylist imediato) e limpa
cookies.

## 4.9 `GET /v1/me`

**Objetivo:** dado do usuário autenticado + escritório ativo — carrega o
`AppShell` no boot do frontend. **Resposta 200:**
```json
{
  "usuario": { "id": "...", "nome": "...", "email": "...", "avatarUrl": null,
               "tema": "SISTEMA", "idioma": "pt-BR" },
  "membro": { "id": "...", "papel": "ADVOGADO", "permissions": ["case:read:assigned", "..."] },
  "escritorio": { "id": "...", "nome": "...", "slug": "..." }
}
```

## 4.10 `GET /v1/auth/sessions`

**Objetivo:** listar sessões ativas (reafirma
[../ux/10-perfil.md §10.4](../ux/10-perfil.md)). **Resposta 200:** array de
`{ id, dispositivo, ip, ultimoUsoEm, criadaEm, atual: boolean }`.

## 4.11 `DELETE /v1/auth/sessions/:id`

**Objetivo:** revogar uma sessão específica. **Permissão:** apenas a própria
sessão do usuário (ownership estrito, sem escopo `ALL` — ninguém revoga
sessão alheia por aqui; isso é `member:remove` no módulo Memberships).
**Resposta 204.**

## 4.12 `DELETE /v1/auth/sessions` (todas exceto a atual)

**Query:** `exceptCurrent=true` (padrão). **Resposta 204.**

## 4.13 `POST /v1/me/password`

**Objetivo:** alterar senha. **Body:** `{ "senhaAtual": "...", "novaSenha": "..." }`.
**Resposta 204. Regra:** revoga todas as demais sessões (reafirma
[../08-especificacao-modulos.md §8.7](../08-especificacao-modulos.md)).
**Erros:** `401` (senha atual incorreta), `422` (nova senha fora da política).

## 4.14 `POST /v1/auth/password-recovery`

**Objetivo:** solicitar redefinição. **Body:** `{ "email": "..." }`.
**Resposta 202** sempre (nunca revela se o e-mail existe). Token de uso único,
TTL 30 min, enviado por e-mail.

## 4.15 `POST /v1/auth/password-reset`

**Body:** `{ "token": "...", "novaSenha": "..." }`. **Resposta 204.** **Regra:**
revoga todas as sessões ativas + notificação de segurança por e-mail.

## 4.16 `POST /v1/me/mfa/enable` · `POST /v1/me/mfa/verify` · `POST /v1/me/mfa/disable`

Fluxo guiado reafirmando [../ux/10-perfil.md §10.6](../ux/10-perfil.md):
`enable` retorna QR code (URI `otpauth://`) + segredo; `verify` confirma o
primeiro código e retorna 10 códigos de recuperação (exibidos uma única vez);
`disable` exige senha atual + código MFA válido.

---

**Anterior:** [03-autorizacao.md](03-autorizacao.md) · **Próximo:** [05-offices.md](05-offices.md)
