# 16 — Audit (Endpoints)

> Entidade `LogAuditoria` (append-only, particionada) em
> [../database/06-entidades-ia-notificacoes-auditoria.md §6.6](../database/06-entidades-ia-notificacoes-auditoria.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/audit` | Consultar trilha de auditoria do escritório | `audit:read` |
| `GET` | `/v1/legal-cases/:id/audit` | Auditoria filtrada a um processo | `audit:read` |
| `GET` | `/v1/documents/:id/audit` | Auditoria de acesso a um documento | `audit:read` |
| `GET` | `/v1/clients/:id/audit` | Auditoria de um cliente | `audit:read` |
| `POST` | `/v1/audit/export` | Exportação (assíncrona) — **preparação futura** | `audit:read` |

## 16.1 `GET /v1/audit`

**Query:** `atorId`, `acao` (múltiplo, ex.: `document.download,case.update`),
`recursoTipo`, `recursoId`, `resultado` (`SUCESSO`\|`FALHA`\|`NEGADO`),
`criadoEm[gte|lte]`, cursor/limit (padrão 50, máximo 200 — maior que o
padrão de outras listas por ser tela de investigação, não de navegação
cotidiana).
**Resposta 200:**
```json
{ "data": [
    { "id":"...", "ator":{"nome":"Camila T."}, "acao":"document.download",
      "recursoTipo":"Documento", "recursoId":"...", "resultado":"SUCESSO",
      "ip":"200.x.x.x", "correlationId":"...", "criadoEm":"..." }
  ], "pagination": {...} }
```
`dadosAntes`/`dadosDepois` **não** são incluídos na listagem por padrão (
payload pesado, raramente necessário na varredura) — disponíveis apenas no
detalhe (`GET /v1/audit/:id`, implícito, mesmo padrão de recurso individual).

## 16.2 Escopo de leitura

`audit:read` no papel `SOCIO` é limitado ao próprio escritório (nunca
cross-tenant, RLS reforça isso independentemente); `ADMIN`/`OWNER` têm a
mesma visão — não existe visão de auditoria "global" entre escritórios em
nenhum papel, mesmo administrativo, reafirma isolamento de
[../database/01-estrategia-multitenancy.md](../database/01-estrategia-multitenancy.md).

## 16.3 `POST /v1/audit/export` (preparação futura)

Documentado como **contrato reservado, não implementado na Fase 1** — a
tela administrativa de auditoria ([../08-especificacao-modulos.md §8.8](../08-especificacao-modulos.md))
lista "exportação CSV" como funcionalidade do módulo; o endpoint aqui
formaliza a forma esperada (`202` + job assíncrono + link assinado, mesmo
padrão de `POST /v1/me/export`) para que o backend já reserve o desenho,
sem exigir implementação nesta fase.

---

**Anterior:** [15-search.md](15-search.md) · **Próximo:** [17-errors.md](17-errors.md)
