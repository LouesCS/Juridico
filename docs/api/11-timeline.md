# 11 — Timeline (Endpoints)

> Entidade `EventoTimeline` em
> [../database/05-entidades-documentos-colaboracao.md §5.1](../database/05-entidades-documentos-colaboracao.md).
> Tela em [../ux/06-processos.md §6.3](../ux/06-processos.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/timeline` | Listar eventos cronológicos | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/timeline` | Criar andamento/anotação manual | `case:update` |
| `PATCH` | `/v1/legal-cases/:id/timeline/:eventoId` | Editar anotação manual (fixar/desafixar) | Autoria própria ou `case:update` |
| `DELETE` | `/v1/legal-cases/:id/timeline/:eventoId` | Excluir (apenas eventos manuais) | Autoria própria ou `case:update` |

## 11.1 `GET /v1/legal-cases/:id/timeline`

**Query:** `tipo` (múltiplo — `ANDAMENTO`, `DOCUMENTO`, `COMENTARIO`,
`PRAZO`, `IA`, etc.), `dataEvento[gte|lte]`, `origem`, cursor/limit
(padrão 30, ordenado por `dataEvento DESC`).
**Resposta 200:**
```json
{ "data": [
    { "id":"...", "tipo":"DOCUMENTO", "titulo":"Contestação anexada",
      "dataEvento":"2026-08-10T14:00:00.000Z", "autor":{"nome":"Camila T."},
      "origem":"MANUAL", "entidadeRelacionada": {"tipo":"documento","id":"..."} }
  ], "pagination": { "nextCursor": "...", "hasMore": true } }
```
**Regra:** eventos do tipo `PRAZO` são projeção somente-leitura gerada a
partir de `Prazo` (reafirma resolução de conflito registrada em
[../database/04-entidades-clientes-processos.md §4.6](../database/04-entidades-clientes-processos.md))
— não editáveis/excluíveis por este endpoint; a origem de verdade é
`PATCH /v1/legal-cases/:id/deadlines/:prazoId`.

## 11.2 `POST /v1/legal-cases/:id/timeline`

**Body:** `{ "tipo": "ANOTACAO", "titulo": "...", "descricao": "...",
"dataEvento": "2026-08-10T00:00:00.000Z" }` — `dataEvento` opcional,
default `now()`; pode ser retroativa (ex.: importação de andamento antigo).
**Resposta 201.** **Erros:** `422` (`code: TYPE_NOT_MANUAL`) se `tipo` não
está entre `ANOTACAO`/`PERSONALIZADO` — os demais tipos só são criados pelo
sistema como efeito colateral de outra operação (upload, prazo, comentário),
nunca diretamente por este endpoint.

## 11.3 `DELETE /v1/legal-cases/:id/timeline/:eventoId`

**Erros:** `403` (`code: SYSTEM_EVENT_NOT_DELETABLE`) para eventos com
`origem != MANUAL`. Soft delete, auditado (reescrita de histórico mesmo que
soft, reafirma [../database/05-entidades-documentos-colaboracao.md §5.1](../database/05-entidades-documentos-colaboracao.md)).

---

**Anterior:** [10-documents.md](10-documents.md) · **Próximo:** [12-comments.md](12-comments.md)
