# 07 — Users (Endpoints)

> Perfil pessoal — distinto de Identity (04): aqui é dado e preferência, lá é
> autenticação e sessão. Ambos operam sobre `Usuario`/`Membro`, reafirma
> [../database/03-entidades-identidade-escritorios.md §3.1](../database/03-entidades-identidade-escritorios.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `PATCH` | `/v1/me` | Atualizar dados pessoais | Próprio usuário, sem escopo de papel |
| `POST` | `/v1/me/avatar` | Enviar foto de perfil | Idem |
| `DELETE` | `/v1/me/avatar` | Remover foto | Idem |
| `PATCH` | `/v1/me/preferences` | Tema, idioma, fuso, densidade, página inicial | Idem |
| `GET` | `/v1/me/identities` | Contas vinculadas (Google/Microsoft) | Idem |
| `DELETE` | `/v1/me/identities/:id` | Desvincular provedor | Idem |
| `POST` | `/v1/me/export` | Solicitar exportação de dados (LGPD) | Idem |
| `POST` | `/v1/me/delete-request` | Solicitar exclusão/anonimização de conta | Idem |

## 7.1 `PATCH /v1/me`

**Body (parcial):** `nome`, `sobrenome`, `telefone`, `cargo`, `oab` — ver
[18-dtos.md `AtualizarUsuarioDTO`](18-dtos.md). Alteração de `email` **não**
está neste endpoint — segue fluxo próprio de confirmação em dois e-mails
(fora do MVP declarado explicitamente em
[../01-visao-produto.md §1.5](../01-visao-produto.md) como refinamento
futuro; nesta fase, alteração de e-mail exige suporte manual).

## 7.2 `POST /v1/me/avatar`

**Body:** `multipart/form-data`, campo `arquivo` (imagem, máx. 5 MB).
**Resposta 200:** `{ "avatarUrl": "https://..." }`. **Regras:** processada
(redimensionada) de forma síncrona (arquivo pequeno, não passa pela fila de
documentos) e armazenada no mesmo storage S3-compatible, bucket separado de
documentos jurídicos.

## 7.3 `PATCH /v1/me/preferences`

**Body:**
```json
{ "tema": "ESCURO", "idioma": "pt-BR", "fusoHorario": "America/Sao_Paulo",
  "densidade": "COMPACTO", "paginaInicialPadrao": "/dashboard" }
```
**Resposta 200.** Reafirma persistência otimista de
[../ux/10-perfil.md §10.3](../ux/10-perfil.md) — o frontend aplica a mudança
antes da confirmação do servidor.

## 7.4 `GET /v1/me/identities` · `DELETE /v1/me/identities/:id`

**Erros (DELETE):** `409` (`code: LAST_AUTH_METHOD`) se for o único método de
autenticação restante — reafirma
[../database/03-entidades-identidade-escritorios.md §3.2](../database/03-entidades-identidade-escritorios.md).

## 7.5 `POST /v1/me/export`

**Resposta 202:** `{ "jobId": "..." }`. Notificação in-app + e-mail quando
pronto, com link assinado de TTL curto. Reafirma
[../database/10-soft-delete-retencao-lgpd.md §10.12.1](../database/10-soft-delete-retencao-lgpd.md)
— escopo é sempre "meus dados", nunca dado de terceiro tocado pelo usuário.

## 7.6 `POST /v1/me/delete-request`

**Body:** `{ "confirmacao": true }`. **Resposta 202.** **Regra:** aciona
anonimização assíncrona (reafirma
[../database/03-entidades-identidade-escritorios.md §3.1.2](../database/03-entidades-identidade-escritorios.md)),
nunca remoção física imediata; revoga todas as sessões ao concluir.

---

**Anterior:** [06-memberships.md](06-memberships.md) · **Próximo:** [08-clients.md](08-clients.md)
