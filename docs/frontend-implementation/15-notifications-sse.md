# 15 — Notifications e SSE

## Não implementado

Nenhum código escrito. Backend: módulo Notifications **não implementado**
— `GET /v1/notifications/stream` não existe. O `SseManager` descrito em
`docs/frontend/20-notifications-sse.md §20.2` (uma conexão por sessão ×
escritório, `EventSource` nativo com `withCredentials`, fallback de proxy
via Route Handler) continua apenas arquitetura; `app/api/sse/notifications/route.ts`
referenciado em `docs/frontend/02-estrutura-pastas.md` não foi criado.

---

**Anterior:** [14-comments-tags.md](14-comments-tags.md) · **Próximo:** [16-search.md](16-search.md)
