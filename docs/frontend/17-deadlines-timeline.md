# 17 — Prazos e Timeline

Reafirma `docs/ux/06-processos.md` (abas Prazos/Timeline),
`docs/api/09-legal-cases.md` (prazos) e `docs/api/11-timeline.md`.
Backend: nenhum dos dois implementado — dependem de Legal Cases (ver
[16-legal-cases.md](16-legal-cases.md) e
[31-decisions.md §31.1](31-decisions.md)).

## 17.1 Por que são duas features, não uma

`Prazo` é uma entidade própria no domínio (não um simples tipo de evento
de timeline) — decisão já registrada em
`docs/database/13-decisoes-riscos-proxima-etapa.md` e reafirmada em
`docs/backend-implementation/19-decisions.md`: `EventoTimeline` é uma
**projeção espelho** de `Prazo`, não o inverso. O frontend reflete essa
mesma separação: `features/deadlines/` (CRUD de prazo) e
`features/timeline/` (leitura cronológica, incluindo a projeção
automática de prazos) são features distintas, cada uma com sua própria
API pública — `legal-cases` consome as duas via `index.ts`.

## 17.2 Deadlines — queries e mutations

`useCaseDeadlines(caseId)` · `useAllDeadlines(filters)` (endpoint
agregado `GET /v1/deadlines`, usado pela rota `/prazos` e pelo bloco de
Dashboard) · `useCreateDeadline` · `useUpdateDeadline` ·
`useCompleteDeadline` (otimista — checkbox inline, reafirma
[10-tanstack-query.md §10.4](10-tanstack-query.md)) · `useReopenDeadline`
· `useCancelDeadline` (exige motivo, campo obrigatório no `ConfirmDialog`
— reafirma `docs/ux/14-ux-writing.md`: "Cancelar este prazo fatal?
Informe o motivo.").

Componentes: `DeadlineCard`, `DeadlineBadge` (semáforo 🔴≤2d/🟡≤7d/⚪>7d,
cor nunca é o único sinal — reafirma
[24-accessibility.md §24.2](24-accessibility.md)), lista ordenada por
`dataVencimento`. Prazo `FATAL` recebe borda vermelha adicional (nunca só
cor, reafirma `docs/ux/06-processos.md §6.2` "Prazos").

## 17.3 Timeline — queries

`useCaseTimeline(caseId, filters)` — `useInfiniteQuery`, carregamento
incremental por scroll (nunca paginação numerada, reafirma
`docs/ux/06-processos.md`: "carregamento incremental no scroll, nunca
paginação numerada"). Filtro por tipo (`Todos`/`Andamentos`/`Documentos`/
`Comentários`/`IA`) é estado de URL (`nuqs`), não Zustand.

Agrupamento por dia (cabeçalho de data sticky) e marcador colorido por
tipo são responsabilidade do componente `Timeline`/`TimelineItem`
(catálogo em [13-design-system.md](13-design-system.md)) — item de IA usa
`bg-ai-subtle` no marcador (única exceção documentada à regra "violeta só
em `AISummaryCard`", já prevista em `docs/ux/12-design-system.md`).

## 17.4 Performance da Timeline

Requisito de aceitação já registrado em `docs/ux/06-processos.md §6.15`:
"Timeline lida com 10 mil+ eventos sem travar o scroll". Implementado com
`useInfiniteQuery` + virtualização (TanStack Virtual) — nenhuma tentativa
de carregar o histórico completo de uma vez, mesmo em background.

## 17.5 Edição controlada e exclusão

Só eventos manuais (`origem = MANUAL`) são editáveis/excluíveis — eventos
automáticos (gerados pelo sistema a partir de outra ação: upload de
documento, criação de prazo) não têm ação de edição/exclusão na UI porque
o backend rejeitaria com `403 SYSTEM_EVENT_NOT_DELETABLE` (o frontend já
esconde a ação para esses itens, evitando o erro previsível — reafirma
[06-autorizacao.md §6.1](06-autorizacao.md): esconder é UX, não a
autorização real).

---

**Anterior:** [16-legal-cases.md](16-legal-cases.md) · **Próximo:** [18-documents-folders.md](18-documents-folders.md)
