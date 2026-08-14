# 13 — Search *(não implementado nesta rodada)*

Nenhuma coluna `tsvector`/índice trigram foi criada (dependia de migration
real). Contrato pronto (`docs/api/15-search.md`), estratégia pronta
(`docs/database/09-indices-busca-performance.md`).

**Primeiro passo da próxima rodada:** exige migration SQL manual (colunas
geradas `tsvector`, extensão `pg_trgm`) — só pode avançar depois que houver
Postgres real disponível para desenvolver contra.

---

**Anterior:** [12-notifications.md](12-notifications.md) · **Próximo:** [14-ai.md](14-ai.md)
