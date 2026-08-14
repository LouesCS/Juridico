# 20 — Notificações e Gerenciador de SSE

Reafirma `docs/ux/11-notificacoes.md` e `docs/api/13-notifications.md` +
a decisão de autenticação SSE já fechada em
`docs/api/02-autenticacao.md §2.9`. Backend: módulo **Notifications não
implementado** — só o schema (`Notificacao`, `PreferenciaNotificacao`)
existe; o endpoint `GET /v1/notifications/stream` em si não existe ainda
(ver [31-decisions.md §31.1](31-decisions.md)). Esta arquitetura é
desenhada para ligar contra o contrato real assim que ele existir, sem
mudança de componente — só do handler MSW.

## 20.1 Central de notificações

```
features/notifications/
├── api/{keys,queries,mutations}.ts   → useNotifications(filters), useUnreadCount, useMarkRead, useMarkAllRead, usePreferences, useUpdatePreferences
├── components/{notification-drawer,notification-item,notification-bell}.tsx
├── schemas/sse-event.schema.ts       # Zod — validação em runtime do payload SSE, ver 09-openapi.md §9.5
└── index.ts
```

Drawer (não modal) — reafirma `docs/ux/04-navigation.md §4.4`. Ícone da
Topbar (`notification-bell.tsx`) mostra `useUnreadCount()`, contador nunca
zera silenciosamente em erro de rede (mantém o último valor conhecido,
reafirma `docs/ux/11-notificacoes.md`: "badge mantém última contagem
conhecida em erro"). Página completa `/notificacoes` usa
`useNotifications` com `useInfiniteQuery` (cursor).

## 20.2 Gerenciador de SSE — um por sessão × escritório ativo

`lib/api/sse.ts` — módulo único, consumido por `providers/sse-provider.tsx`
(montado uma vez em `(app)/layout.tsx`, não por feature individual):

```ts
class SseManager {
  private source: EventSource | null = null;
  private reconnectAttempt = 0;
  private lastEventId: string | null = null;

  connect(officeId: string) {
    this.close();
    const url = new URL(`${BASE_URL}/notifications/stream`);
    this.source = new EventSource(url, { withCredentials: true }); // cookie httpOnly, nunca token em query string
    this.source.addEventListener('notification.created', this.onNotification);
    this.source.addEventListener('notification.read', this.onRead);
    this.source.addEventListener('heartbeat', () => { this.reconnectAttempt = 0; });
    this.source.onerror = this.handleError;
  }

  private handleError = () => {
    // TOKEN_EXPIRED (evento `error` explícito do backend, §2.9) exige refresh
    // antes de reabrir — reaproveita ensureFreshSession() de 08-http-client.md §8.4.
    // Qualquer outro erro é queda de rede comum: EventSource já reconecta
    // sozinho (com Last-Event-ID nativo); backoff exponencial manual só
    // entra depois de N falhas nativas seguidas, para não competir com o
    // reconnect nativo do browser.
  };

  close() { this.source?.close(); this.source = null; }
}
```

- **Uma conexão por sessão × escritório** — nunca uma por componente que
  precisa de notificação (o `SseProvider` é o único que abre/fecha;
  componentes consomem eventos via um `EventTarget`/store interno, não
  criando seu próprio `EventSource`).
- **Heartbeat** a cada 30s (contrato do backend, §2.9) — usado só para
  resetar o contador de tentativas de reconexão, não para nenhuma lógica
  de UI visível.
- **Reconexão:** `EventSource` nativo já reconecta e envia
  `Last-Event-ID` automaticamente em quedas de rede comuns. Expiração de
  token (evento `error` com `code: TOKEN_EXPIRED`) é o único caso tratado
  explicitamente pelo `SseManager`: chama `ensureFreshSession()` e só
  então reabre a conexão — sem isso, o `EventSource` ficaria reconectando
  indefinidamente contra um cookie já expirado.
- **Fallback de proxy:** se `new EventSource(..., {withCredentials:true})`
  falhar de forma persistente (ex.: rede corporativa bloqueando
  cross-subdomain, CSP do cliente do escritório), o `SseManager` troca a
  URL para `/api/sse/notifications` (Route Handler local, ver
  [04-app-router.md §4.5](04-app-router.md)) — mesma interface pública,
  decisão de qual caminho usar é interna ao manager, nunca visível ao
  componente.
- **Eventos duplicados:** cada evento carrega um `id` (usado como
  `Last-Event-ID` pelo próprio browser); o handler de
  `notification.created` deduplica por esse `id` antes de invalidar a
  query (`Set` de IDs já processados, tamanho limitado às últimas ~50
  entradas — suficiente para cobrir reconexões próximas, sem crescer sem
  limite).

## 20.3 Ciclo de vida — abertura, troca de escritório, logout, revogação

| Evento | Ação do `SseProvider` |
|---|---|
| Login / boot autenticado | `connect(officeId)` |
| Troca de escritório (§7.5) | `close()` da conexão antiga → `connect(novoOfficeId)` |
| Logout (§5.4) | `close()`, nunca reconecta |
| Sessão revogada (§5.6) | `close()` — o próprio evento `error` do SSE já teria sido um dos sinais de revogação, tratado como parte do fluxo geral de 401/`SESSION_REVOKED` |
| Aba em background (`document.visibilityState=hidden`) | Conexão **permanece aberta** — fechar/reabrir a cada troca de aba geraria mais reconexões que o ganho de economia justificaria para o volume esperado |

## 20.4 Invalidação de query a partir de evento SSE

`notification.created` → invalida `['office', officeId, 'notifications',
'unread-count']` e, se o drawer estiver aberto, `['office', officeId,
'notifications', 'list']`; **não** dispara toast por padrão (reafirma
`docs/ux/11-notificacoes.md` — prioridade `NORMAL`/`BAIXA` não interrompe)
— exceção: prioridade `SEGURANCA` sempre gera toast imediato, mesmo com o
drawer fechado.

## 20.5 Fallback de polling

Reservado a um único caso: acompanhar `statusProcessamento` de um
documento recém-enviado enquanto sua tela de detalhe está aberta, caso o
evento SSE correspondente não chegue em até 5s do upload confirmado
(`features/documents`, não `features/notifications` — é um polling de
recurso específico, não um substituto geral do SSE). Nenhum outro fluxo
usa polling.

## 20.6 Nunca

Token em query string, em nenhuma circunstância — nem no fallback de
proxy (o Route Handler lê o cookie do próprio request Next.js, nunca
recebe o token via parâmetro de URL).

---

**Anterior:** [19-comments-tags.md](19-comments-tags.md) · **Próximo:** [21-search.md](21-search.md)
