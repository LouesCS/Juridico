# 08 — Legal Cases *(não implementado nesta rodada)*

O módulo de maior complexidade (DDD completo) não foi iniciado. Já prontos:
schema completo (`Processo`, `ParteProcesso`, `ProcessoMembro`,
`ProcessoRelacionado`, com FK composta `(id, escritorioId)` nas relações
críticas), contrato completo (`docs/api/09-legal-cases.md`), anatomia de
camadas de referência (`docs/backend/03-camadas.md`, que usa `Processo`
como exemplo).

**Primeiro passo da próxima rodada:** ao contrário de `Offices`/
`Memberships` (que usaram acesso direto ao `PrismaService` por
simplicidade), `LegalCases` deve seguir a anatomia completa de 4 camadas
(Domain/Application/Infrastructure/Presentation) já que é onde DDD completo
foi prometido — `NumeroCnj` como Value Object com validação de dígito
verificador, `ProcessoAcessoPolicy` para segredo de justiça (a regra de
autorização mais crítica do sistema, ainda não implementada em código
nenhuma vez nesta etapa), versionamento otimista via header `If-Match`.

---

**Anterior:** [07-clients.md](07-clients.md) · **Próximo:** [09-deadlines-timeline.md](09-deadlines-timeline.md)
