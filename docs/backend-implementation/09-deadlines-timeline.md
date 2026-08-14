# 09 — Deadlines e Timeline *(não implementado nesta rodada)*

Schema pronto (`Prazo`, `EventoTimeline`). Contrato pronto
(`docs/api/09-legal-cases.md §9.4`, `docs/api/11-timeline.md`). Depende de
`LegalCases` existir primeiro (FK `processoId`).

**Ponto de atenção para a próxima rodada:** a regra "criação/conclusão de
Prazo gera `EventoTimeline` do tipo `PRAZO` na mesma transação" (reafirma
`docs/database/04-entidades-clientes-processos.md §4.6`) precisa ser
implementada como parte do `CriarPrazoUseCase`/`ConcluirPrazoUseCase`, nunca
como trigger de banco (mantém a regra de negócio na camada de aplicação,
reafirma `docs/backend/03-camadas.md`).

---

**Anterior:** [08-legal-cases.md](08-legal-cases.md) · **Próximo:** [10-documents-folders.md](10-documents-folders.md)
