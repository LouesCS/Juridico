# 09 — Filas (BullMQ)

> Reafirma [../05-arquitetura-backend.md §5.8](../05-arquitetura-backend.md).

## 9.1 Filas e jobs

| Fila | Jobs | Concorrência | Módulo produtor |
|---|---|---|---|
| `documents` | antivírus, extração de texto, OCR (futuro), thumbnail | 5 | `Documents` |
| `search` | indexação, reindexação incremental | 10 | `Search` (consumidor de eventos de `LegalCases`/`Clients`/`Documents`/`Tags`/`Comments`) |
| `ai` | geração de resumo (chamada ao provedor + streaming) | 3 (limitado por custo/rate) | `AI` |
| `notifications` | envio in-app, e-mail (via `MailPort`), digest | 20 | `Notifications` |
| `maintenance` | limpeza de lixeira (30 dias), expurgo de sessão, arquivamento de partição de auditoria | 1 | `Shared` (job de sistema, sem módulo de domínio dono) |

## 9.2 Anatomia de um processor

```
jobs/documents.worker.ts        # entry point do processo worker (mesmo código-fonte da API)
modules/documents/infrastructure/processors/
├── antivirus.processor.ts
├── extract-text.processor.ts
├── generate-thumbnail.processor.ts
└── index-content.processor.ts
```
Cada `*.processor.ts` é um `@Processor('documents')` do `@nestjs/bullmq`,
injeta os mesmos use cases/repositórios do módulo (nenhuma duplicação de
lógica entre o caminho HTTP síncrono e o caminho assíncrono).

## 9.3 Idempotência e retry

`jobId` determinístico (`resumo-ia:{resumoIaId}:{versaoResumo}`,
`documento-processar:{documentoId}:{versao}`) — reentrega do BullMQ (ex.:
worker reiniciado no meio do processamento) não duplica efeito, reafirma
[../database/12-eventos-fluxos-regras.md §12.2](../database/12-eventos-fluxos-regras.md).
Retry com backoff exponencial (3 tentativas), DLQ (`{fila}:dlq`) para falha
terminal — alerta de observabilidade quando um job cai na DLQ.

## 9.4 Outbox — entrega confiável de evento de domínio

Reafirma [../database/12-eventos-fluxos-regras.md §12.1](../database/12-eventos-fluxos-regras.md):
todo evento de domínio que precisa de efeito assíncrono confiável é gravado
em `eventos_outbox` na **mesma transação** da escrita que o originou;
`OutboxPublisherWorker` (fila própria, `outbox`, concorrência 5) lê a tabela
e publica na fila de destino, marcando `processadoEm` — fecha a lacuna entre
"a transação do banco commitou" e "o job foi de fato enfileirado".

## 9.5 Graceful shutdown

Todo worker drena jobs em execução antes de encerrar (`SIGTERM` →
`worker.close()` aguardando jobs ativos, timeout de 30s antes de forçar) —
reafirma [../05-arquitetura-backend.md §5.13](../05-arquitetura-backend.md).

---

**Anterior:** [08-cache.md](08-cache.md) · **Próximo:** [10-observabilidade.md](10-observabilidade.md)
