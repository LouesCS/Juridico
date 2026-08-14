# 13 — Notifications (Endpoints)

> Entidades `Notificacao`, `PreferenciaNotificacao` em
> [../database/06-entidades-ia-notificacoes-auditoria.md §6.4-6.5](../database/06-entidades-ia-notificacoes-auditoria.md).
> Tela em [../ux/11-notificacoes.md](../ux/11-notificacoes.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/notifications` | Listar (central + página completa) | Próprias, sem escopo de papel |
| `GET` | `/v1/notifications/unread-count` | Contagem não lida (badge) | Idem |
| `POST` | `/v1/notifications/:id/read` | Marcar como lida | Idem |
| `POST` | `/v1/notifications/read-all` | Marcar todas como lidas | Idem |
| `GET` | `/v1/notifications/stream` | Tempo real (SSE) | Idem |
| `GET` | `/v1/me/notification-preferences` | Preferências | Idem |
| `PATCH` | `/v1/me/notification-preferences` | Atualizar preferências | Idem |

## 13.1 `GET /v1/notifications`

**Query:** `status=todas|nao-lidas`, `prioridade=SEGURANCA` (filtro da UI,
reafirma [../ux/11-notificacoes.md §11.6](../ux/11-notificacoes.md)), cursor/limit
(padrão 20, ordenado por `criadoEm DESC`).
**Resposta 200:**
```json
{ "data": [
    { "id":"...", "tipo":"case.timeline.created", "titulo":"Novo andamento",
      "mensagem":"...", "urlAcao":"/legal-cases/.../timeline",
      "prioridade":"NORMAL", "lidaEm":null, "criadoEm":"..." }
  ], "pagination": {...} }
```

## 13.2 `GET /v1/notifications/unread-count`

**Resposta 200:** `{ "count": 3 }`. Chamado no boot do `AppShell` e mantido
atualizado depois via `stream` (§13.5) — não é chamado em polling.

## 13.3 `POST /v1/notifications/:id/read`

**Resposta 204.** Ownership estrito: `404` se a notificação não pertence ao
usuário autenticado (nunca `403` — não revela existência de notificação
alheia).

## 13.4 `POST /v1/notifications/read-all`

> Endpoint identificado como pendência em
> [../ux/20-contexto-proxima-etapa.md](../ux/20-contexto-proxima-etapa.md).

**Body (opcional):** `{ "ate": "2026-08-12T00:00:00.000Z" }` — sem body,
marca todas; com `ate`, marca apenas as anteriores a essa data (permite ao
frontend marcar "as que eu já vi na sessão atual" sem afetar notificações
chegadas durante a leitura). **Resposta 204.**

## 13.5 `GET /v1/notifications/stream` (tempo real)

**Mecanismo:** **SSE** (Server-Sent Events), não WebSocket — reafirma a
preferência já registrada em
[../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md) ("SSE
resolve o caso e é mais simples"); notificação é fluxo unidirecional
servidor→cliente, sem necessidade de o cliente enviar dado de volta no mesmo
canal.

**Request:** `GET /v1/notifications/stream`, autenticado por **cookie
`httpOnly`** (`EventSource` nativo do navegador, sem polyfill) — decisão e
justificativa completa em
[02-autenticacao.md §2.9](02-autenticacao.md).

**Eventos emitidos:**
```
event: notification.created
data: {"id":"...","tipo":"case.deadline.approaching","titulo":"...","prioridade":"ALTA"}

event: notification.read
data: {"id":"..."}

event: heartbeat
data: {}
```
`heartbeat` a cada 30s para manter a conexão viva através de proxies
intermediários e permitir ao cliente detectar queda de conexão e reconectar
(reconexão automática nativa do `EventSource`, com `Last-Event-ID` para não
perder eventos emitidos durante a desconexão breve).

**Escopo:** o stream é filtrado no servidor pelo mesmo `destinatarioId`/
`escritorioId` do usuário conectado — nunca um canal global com filtro no
cliente.

## 13.6 Preferências

**`GET /v1/me/notification-preferences`:** retorna array de
`{ tipoNotificacao, inApp, email, frequencia }`, com os padrões do catálogo
preenchidos mesmo sem linha própria em `PreferenciaNotificacao` (reafirma
[../database/06-entidades-ia-notificacoes-auditoria.md §6.5](../database/06-entidades-ia-notificacoes-auditoria.md)).
**`PATCH`:** aceita array parcial de overrides. **Regra:** notificações
`prioridade = SEGURANCA` não aparecem como configuráveis nesta tela/endpoint
— reafirma [../ux/11-notificacoes.md §11.3](../ux/11-notificacoes.md).

---

**Anterior:** [12-comments.md](12-comments.md) · **Próximo:** [14-ai.md](14-ai.md)
