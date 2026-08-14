# 15 — Search (Endpoints)

> Estratégia de índice em
> [../database/09-indices-busca-performance.md](../database/09-indices-busca-performance.md).
> Experiência em [../ux/09-busca-global.md](../ux/09-busca-global.md) — **a
> funcionalidade mais importante do produto.**

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/search` | Busca global híbrida | Filtrado por permissão, por tipo de resultado |
| `GET` | `/v1/search/suggestions` | Sugestões para campo vazio | Idem |
| `GET` | `/v1/search/recent` | Últimos itens abertos pelo usuário | Próprio usuário |
| `DELETE` | `/v1/search/history` | Limpar histórico de termos buscados | Próprio usuário |

## 15.1 `GET /v1/search`

> Payload de resultado agrupado por tipo — pendência resolvida nesta etapa.

**Query:** `q` (obrigatório, mín. 2 caracteres), `types` (opcional, filtro de
escopo: `legal-cases,documents,clients,tags,comments` — se omitido, busca
todos), `limit` (por grupo, padrão 8, máximo 20).

**Resposta 200:**
```json
{
  "query": "silva",
  "groups": [
    {
      "type": "legal-cases",
      "total": 3,
      "items": [
        { "id": "...", "titulo": "Ação Trabalhista — Reclamante Silva",
          "numeroCnj": "0001234-56.2026.5.02.0001",
          "snippet": "...Reclamante <mark>Silva</mark> pleiteia...",
          "score": 0.98, "url": "/legal-cases/..." }
      ]
    },
    {
      "type": "documents",
      "total": 1,
      "items": [
        { "id": "...", "nome": "Procuração — Silva.pdf",
          "snippet": "...outorga poderes a João <mark>Silva</mark>...",
          "score": 0.81, "processoId": "...", "url": "/documents/..." }
      ]
    },
    { "type": "clients", "total": 1, "items": [ /* ... */ ] },
    { "type": "tags", "total": 0, "items": [] },
    { "type": "comments", "total": 0, "items": [] }
  ]
}
```
- `groups` sempre na ordem fixa: `legal-cases`, `documents`, `clients`,
  `tags`, `comments` — reafirma agrupamento visual de
  [../ux/09-busca-global.md §9.5](../ux/09-busca-global.md).
- `snippet` traz o trecho relevante com `<mark>` ao redor do termo
  encontrado (`ts_headline`, reafirma
  [../database/09-indices-busca-performance.md §9.3.3](../database/09-indices-busca-performance.md)) —
  o frontend renderiza a marcação como destaque visual, nunca HTML arbitrário
  (sanitizado no backend antes de sair).
- `score` é a pontuação de relevância normalizada (0–1), usada apenas para
  ordenação dentro do grupo — **não** exibida ao usuário (reafirma "sem
  indicador numérico de confiança" já registrado em
  [../ux/06-processos.md §6.2.1](../ux/06-processos.md) para IA; mesmo
  princípio de simplicidade aplicado aqui).
- **Correspondência exata de número** (CNJ, número interno, CPF/CNPJ) recebe
  `score: 1.0` e ordena acima de qualquer resultado textual — reafirma regra 1
  de [../ux/09-busca-global.md §9.3](../ux/09-busca-global.md).
- Filtro de permissão (segredo de justiça, confidencialidade, escopo de
  papel) é aplicado **antes** da paginação/contagem — `total` já reflete
  apenas o que o usuário pode ver.
- **Meta de latência p95 < 400ms é contrato de API**, não apenas meta de
  produto — reafirma [20-performance.md](20-performance.md).

## 15.2 `GET /v1/search/suggestions`

**Sem `q`:** retorna `{ "recentes": [...], "sugestoes": [{"label":"Novo Processo","action":"navigate","url":"/legal-cases/new"}, ...] }` —
reafirma [../ux/09-busca-global.md §9.4](../ux/09-busca-global.md).

## 15.3 `GET /v1/search/recent`

**Resposta 200:** últimos 5 itens (qualquer tipo) abertos pelo usuário —
distinto de histórico de termos digitados (§15.4). Fonte: log de navegação do
frontend enviado como telemetria leve, não `LogAuditoria` (que tem outro
propósito, reafirma
[../database/02-convencoes-dados.md §2.16](../database/02-convencoes-dados.md)).

## 15.4 Histórico de termos

Histórico (últimos 10 termos digitados) é mantido **no cliente**
(`localStorage`, não sincronizado ao servidor) — não há endpoint `GET` para
histórico de termos, apenas `DELETE /v1/search/history` documentado por
completude caso uma versão futura sincronize entre dispositivos; no MVP, o
botão "Limpar histórico" de
[../ux/09-busca-global.md §9.9](../ux/09-busca-global.md) é operação
puramente local.

---

**Anterior:** [14-ai.md](14-ai.md) · **Próximo:** [16-audit.md](16-audit.md)
