# 12 — Notifications *(não implementado nesta rodada)*

Schema pronto (`Notificacao`, `PreferenciaNotificacao`). Contrato pronto,
incluindo o endpoint SSE já com decisão de autenticação fechada
(`docs/api/13-notifications.md §13.5`, `docs/api/02-autenticacao.md §2.9` —
cookie httpOnly).

**Primeiro passo da próxima rodada:** o endpoint SSE
(`GET /notifications/stream`) é o primeiro lugar do projeto que precisa de
um `@Sse()` handler do NestJS — nenhum precedente de código para isso ainda
existe no repositório; vale prototipar isoladamente antes de integrar ao
motor de regras de entrega completo.

---

**Anterior:** [11-comments-tags.md](11-comments-tags.md) · **Próximo:** [13-search.md](13-search.md)
