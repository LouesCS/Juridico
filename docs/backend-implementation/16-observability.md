# 16 — Observabilidade

## Implementado

- `CorrelationIdMiddleware` — gera/propaga `X-Correlation-Id` e
  `X-Request-Id`, ecoados na resposta.
- Logs de erro 5xx no `AllExceptionsFilter` (via `Logger` padrão do Nest,
  não Pino ainda).

## Não implementado / pendente

- **Pino** (dependência já instalada em `package.json`) não foi conectado
  como logger da aplicação — o Nest ainda usa seu `Logger` padrão (console).
- Redação de PII em log — não há nenhum log de payload completo ainda
  (nenhum módulo loga body de request), então o risco é baixo, mas a
  disciplina explícita (allowlist por rota) não foi implementada.
- Métricas (latência, taxa de erro por `code`, profundidade de fila) — não
  implementadas.
- OpenTelemetry — não instrumentado.
- `correlationId` **não** está, ainda, sendo propagado para dentro de
  `LogAuditoria` (porque `LogAuditoria` ainda não é escrita por código
  nenhum — ver [15-audit.md](15-audit.md)).

---

**Anterior:** [15-audit.md](15-audit.md) · **Próximo:** [17-tests.md](17-tests.md)
