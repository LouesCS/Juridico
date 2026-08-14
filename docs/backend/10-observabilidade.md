# 10 — Observabilidade

> Reafirma [../05-arquitetura-backend.md §5.12](../05-arquitetura-backend.md).

## 10.1 Logs

Pino (JSON estruturado), campos obrigatórios em toda linha:
`correlationId`, `requestId`, `tenantId`, `membroId`, `nível`, `mensagem`.
**Redação obrigatória** de PII e conteúdo de documento antes de logar —
middleware de log nunca serializa body de request/response inteiro, apenas
campos allowlisted por rota (reafirma
[../09-seguranca-lgpd.md §9.4](../09-seguranca-lgpd.md)).

## 10.2 Tracing

OpenTelemetry (preparado — instrumentação automática de HTTP, Prisma,
BullMQ, Redis) cobrindo `HTTP → guard → use case → repositório → banco →
fila → provedor externo`, propagando `correlationId` como atributo de span
em toda a cadeia — reafirma
[../api/01-convencoes.md §1.10](../api/01-convencoes.md).

## 10.3 Métricas

| Métrica | Tipo |
|---|---|
| Latência por endpoint (p50/p95/p99) | Histograma |
| Taxa de erro por `code` (17-errors.md) | Contador |
| Profundidade de fila por nome | Gauge |
| Custo de IA por tenant/mês | Contador (soma de `custoEstimadoCentavos`) |
| Taxa de feedback positivo/negativo de resumo de IA | Contador |
| Conexões SSE ativas | Gauge |

## 10.4 Health Checks

`GET /health/live` (processo respondendo) · `GET /health/ready` (Postgres +
Redis + Storage alcançáveis) — reafirma
[../05-arquitetura-backend.md §5.12](../05-arquitetura-backend.md); usado
pelo orquestrador de container (Docker/Kubernetes) para decidir restart e
roteamento de tráfego.

## 10.5 Correlation ID — propagação ponta a ponta

```
Frontend gera X-Correlation-Id
   → CorrelationIdMiddleware injeta no contexto da requisição
   → presente em todo log da requisição
   → gravado em LogAuditoria.correlationId
   → propagado ao payload de job de fila (BullMQ job data)
   → presente em todo log do worker que processa o job
```
É o que permite reconstruir, a partir de uma mensagem de erro exibida ao
usuário (reafirma [../ux/14-ux-writing.md §14.2](../ux/14-ux-writing.md)),
toda a cadeia de execução — request, autorização, banco, fila, provedor
externo.

## 10.6 Alertas

Profundidade de DLQ >0 · taxa de erro 5xx acima de limiar · latência p95
acima da meta de [../api/20-performance.md §20.1](../api/20-performance.md) ·
cota de IA de algum tenant próxima do limite — todos como gatilho de alerta,
não apenas dashboard passivo.

---

**Anterior:** [09-filas.md](09-filas.md) · **Próximo:** [11-testes.md](11-testes.md)
