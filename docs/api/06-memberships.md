# 06 — Memberships (Endpoints)

> Entidades `Membro`, `Convite`, `Papel`, `Permissao` em
> [../database/03-entidades-identidade-escritorios.md](../database/03-entidades-identidade-escritorios.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/members` | Listar membros do escritório | `member:read` |
| `PATCH` | `/v1/members/:id` | Alterar cargo/equipe | `member:update-role` (cargo) |
| `PATCH` | `/v1/members/:id/role` | Alterar papel | `member:update-role` |
| `DELETE` | `/v1/members/:id` | Desativar membro | `member:remove` |
| `POST` | `/v1/invitations` | Convidar novo membro | `member:invite` |
| `GET` | `/v1/invitations` | Listar convites pendentes | `member:invite` |
| `POST` | `/v1/invitations/:id/resend` | Reenviar convite | `member:invite` |
| `DELETE` | `/v1/invitations/:id` | Revogar convite | `member:invite` |
| `POST` | `/v1/invitations/:token/accept` | Aceitar convite | Pública (via token) |
| `GET` | `/v1/roles` | Listar papéis disponíveis (sistema + customizados) | `member:read` |
| `GET` | `/v1/permissions` | Catálogo de permissões (para tela de simulação) | `role:manage` |

## 6.1 `GET /v1/members`

**Query:** `status`, `papel`, cursor/limit padrão. **Resposta 200:**
```json
{ "data": [{ "id":"...", "usuario": {"nome":"Camila T.","email":"..."},
             "papel": "ADVOGADO", "status": "ATIVO", "entrouEm": "..." }],
  "pagination": { "nextCursor": null, "hasMore": false } }
```

## 6.2 `POST /v1/invitations`

**Body:** `{ "email": "novo@escritorio.com.br", "papelId": "..." }`.
**Resposta 201:** dado do convite (sem o token em claro — reafirma
[../database/03-entidades-identidade-escritorios.md §3.6.1](../database/03-entidades-identidade-escritorios.md),
apenas hash é persistido; o token vai só no e-mail). **Regras:** reenvio
revoga convite pendente anterior do mesmo e-mail antes de criar o novo.
**Idempotência:** `Idempotency-Key` obrigatório.

## 6.3 `POST /v1/invitations/:token/accept`

**Body (se usuário novo):** `{ "nome": "...", "sobrenome": "...", "senha": "..." }`
— vazio se o e-mail já corresponde a um `Usuario` existente autenticado.
**Resposta 200:** cria `Membro`, marca convite `ACEITO`. **Erros:** `410`
(expirado), `409` (`code: ALREADY_ACCEPTED` — idempotente, reafirma
[../database/12-eventos-fluxos-regras.md §12.5](../database/12-eventos-fluxos-regras.md),
nunca cria segundo `Membro`).

## 6.4 `PATCH /v1/members/:id/role`

**Body:** `{ "papelId": "..." }`. **Erros:** `403` (`code:
SELF_ESCALATION_FORBIDDEN`) se `id` corresponde ao próprio ator — reafirma
regra 25 de [../database/12-eventos-fluxos-regras.md §12.4](../database/12-eventos-fluxos-regras.md).
`409` (`code: LAST_OWNER`) se a mudança deixaria o escritório sem `OWNER`
ativo.

## 6.5 `DELETE /v1/members/:id`

**Objetivo:** desativação (soft), não exclusão física. **Resposta 200:**
```json
{ "desativado": true, "processosParaReatribuir": [] }
```
Se `processosParaReatribuir` não está vazio, a API retorna **409** com a
lista de processos onde o membro é responsável — o cliente deve reatribuir
antes de repetir a chamada (reafirma
[../database/12-eventos-fluxos-regras.md §12.3.11](../database/12-eventos-fluxos-regras.md)).
Ao concluir: revoga todas as sessões do membro.

## 6.6 `GET /v1/roles`

**Resposta 200:** papéis de sistema (`ehSistema: true`, não editáveis) +
customizados do escritório. Base para o seletor de papel em convite/edição
(reafirma [../ux/04-navigation.md §4.5](../ux/04-navigation.md)).

---

**Anterior:** [05-offices.md](05-offices.md) · **Próximo:** [07-users.md](07-users.md)
