# 21 — Contexto Oficial para a Próxima Rodada

## CONTEXTO OFICIAL (após a Sprint 15 / Prompt 14)

**Escopo acumulado.** Prompt 6B: Bootstrap, Design System (parcial),
Cliente HTTP + tipos (parcial), Providers/TanStack Query, Autenticação.
Prompt 6C (1ª rodada): Office Context + App Shell. Prompt 6C (2ª rodada):
Team/Memberships, Dashboard real, Users/Profile. Prompt 7: Clients e
Legal Cases. Sprint 08: Deadlines e Timeline. Sprint 09: Documents e
Folders. Sprint 10: Universal Search. Sprint 11: Assistente Jurídico
Inteligente. Sprint 12/Prompt 11: Reorganização da Navegação. Sprint 13/
Prompt 12: Permission Engine. Sprint 14/Prompt 13: Configuration Engine.
**Sprint 15/Prompt 14 (esta rodada): Task Engine** — motor de
produtividade completo: Minhas Tarefas, Equipe, Kanban (drag-and-drop
nativo), Calendário, criação a partir de Modelo, checklist, dependências,
vínculos, timeline, comentários e IA por tarefa, dashboard e "Continuar
trabalhando" na Home, Ações Rápidas em Cliente/Processo — ver
`docs/task-engine.md` (documento dedicado, cobre backend + frontend) e
`docs/backend-implementation/23-task-engine.md`.

**Como rodar localmente.**
```
cd apps/web
cp .env.example .env.local
npm install
npx vitest run       # 216 testes, todos passando (usam MSW, não precisam de backend)
npm run build          # next build
npm run dev             # requer apps/api/ rodando em paralelo para dados reais
npm run dev:mock       # liga MSW de demonstração (mocks/demo/handlers.ts) — inclui Task Engine
```

**O que mudou nesta rodada:**

- **`config/navigation.ts`** — o item plano "Tarefas" (grupo GESTÃO DO
  TEMPO) virou um grupo próprio "TAREFAS" com 7 itens: Minhas Tarefas,
  Equipe, Kanban, Calendário, Templates (aponta para a rota já existente
  `/configuracoes/modelos-tarefa`, nunca duplicada), Categorias (idem,
  `/configuracoes/categorias-tarefas`), Relatórios (placeholder honesto).
- **`features/tasks/` (novo)** — api layer completa (`tasks.api.ts` com
  todos os endpoints reais + `keys.ts`/`queries.ts`/`mutations.ts`, mesmo
  padrão de `features/deadlines/`), `TaskFormDialog` (criar/editar, único
  componente, `fixedStatusId`/`fixedResponsavelId`/`fixedVinculo` para
  reaproveitar do Kanban e das Ações Rápidas de Cliente/Processo),
  `TaskListPage` (compartilhada por Minhas Tarefas/Equipe via prop
  `scope`), `TaskKanbanPage` (drag-and-drop nativo HTML5, zero biblioteca
  nova), `TaskCalendarPage` (reaproveita o `CalendarView` genérico —
  ver achado abaixo), `TaskDetailPage` (7 abas: Detalhes/Checklist/
  Dependências/Vínculos/Timeline/Comentários/IA) + `CreateTaskFromTemplateDialog`.
- **Achado de arquitetura — `CalendarView` genericizado.** O calendário de
  Prazos (`features/deadlines/components/calendar-view.tsx`, Sprint 08)
  era 100% específico de `Prazo`. Em vez de duplicar para Tarefa, foi
  extraído para `components/data-display/calendar-view.tsx` como
  `CalendarView<T extends CalendarItem>` (accessor props: `getDate`/
  `isDone`/`isUrgent`/`renderDetail`/`getSubtitle`/`renderRowExtra`).
  `features/deadlines/components/calendar-view.tsx` virou uma casca fina
  sobre o componente genérico — zero mudança de import para
  `deadlines-page.tsx`, comportamento visual idêntico.
- **`FavoriteButton` também genericizado** — extraído de
  `features/documents/` para `components/data-display/favorite-button.tsx`
  (já era 100% agnóstico de domínio); reaproveitado por Documentos e
  Tarefas.
- **Generalizações de cross-cutting features (mesmo padrão do backend)**:
  `features/timeline/` ganhou `'tarefa'` como categoria +
  `CRIACAO_TAREFA`/`CONCLUSAO_TAREFA`/`CANCELAMENTO_TAREFA` em
  `TIMELINE_TYPE_META` (achado: `TIMELINE_TYPE_META` é
  `Record<TimelineEventType,...>` exaustivo — esquecer uma chave nova
  quebra o build, não silenciosamente); `features/ai/` ganhou os 5 tipos
  de resumo de Tarefa em `AiSummaryPanel` (já preparado desde antes) e
  `tarefaId`/`'TAREFA'` em `AiSourceDTO`/`source-list.tsx`;
  `features/search/` ganhou `'tasks'` em `SearchResultType`/
  `SEARCH_GROUP_ORDER`/`prefix-scope.ts` (`t:`) /`command-palette.tsx`.
  Timeline de Tarefa é só leitura no frontend (`TaskTimelineTab`,
  componente novo — não reaproveita `TimelineItemCard` porque ele é
  hardwired a mutations/URLs de Processo).
- **Dashboard (Home)** — `TaskSummaryCard` (6 números + barra de
  produtividade) e `ContinueWorkingCard` ("Continuar trabalhando" — minhas
  tarefas pendentes por vencimento mais próximo), mesmo padrão de
  `DashboardCard`/`RecentCasesCard`.
- **Ações Rápidas** — "Nova tarefa" adicionada a `ClientDetailPage` e
  `LegalCaseDetailPage`, usando `TaskFormDialog` com `fixedVinculo`
  (a tarefa já nasce vinculada ao Cliente/Processo de origem); painel
  "Relacionados" de ambas ganhou um item "Tarefas" apontando para
  `/tarefas/minhas?clienteId=`/`?processoId=` (deep-link de filtro, sem
  precisar de uma aba "Tarefas" dedicada dentro de Cliente/Processo).
- **Backend ganhou um endpoint que não existia**: `GET /tasks/:id/timeline`
  — `ListCaseTimelineUseCase` original é específico de Processo (mescla
  com projeção de `Prazo`); Tarefa não tem equivalente, então um
  `ListTaskTimelineUseCase` novo, mais simples, foi adicionado durante
  esta mesma rodada para o frontend ter o que consumir na aba Timeline.
- **MSW** — `mocks/handlers/tasks.ts` (novo, registrado em `server.ts` e
  `test/setup.ts`) + bloco `tasksDemoHandlers` em `mocks/demo/handlers.ts`;
  `mocks/handlers/identity.ts` e `mocks/demo/handlers.ts` ganharam as 7
  permissões `task:*` + `comment:create` (esta última nunca tinha sido
  exercitada pelo frontend antes — Comments não tinha nenhuma tela real
  até a aba Comentários de Tarefa desta rodada) no usuário OWNER padrão.

**Testes:** 216 reais (203 já existentes + 13 novos — 4 arquivos de
spec: `task-list-page`, `task-kanban-page`, `task-calendar-page`,
`task-detail-page`).

**Design System:** nenhuma dependência nova, nenhum primitivo novo —
drag-and-drop do Kanban usa a API nativa do navegador (`draggable` +
`dragstart`/`dragover`/`drop`), mesma disciplina anti-dependência de todas
as rodadas anteriores.

**Pendências priorizadas para a próxima rodada:**

1. **Relatórios de Tarefas** — nav item existe, página é placeholder
   honesto (`ModulePlaceholderPage`), sem dado simulado.
2. **Busca/autocomplete real na aba Vínculos** — hoje aceita colar o ID
   diretamente para os 6 tipos catálogo-apenas (Contrato/Serviço/
   Financeiro/Publicação/Pedido/Registro de Trabalho); Cliente/Processo/
   Documento também não têm um seletor dedicado, mesma limitação.
3. **Módulo Financeiro** — `FinancialSettingsPage` já existe; falta o
   módulo de negócio real.
4. **Comments completo** (edição/exclusão/menções) — Tarefa é o 3º
   consumidor mínimo (create/list), mesma pendência de rodadas anteriores.
5. **Conectar Campos Extras/Obrigatórios** aos formulários reais de
   Cliente/Processo e **Feriados** ao cálculo de prazos em dias úteis —
   pendência do Prompt 13, ainda não endereçada.
6. **Streaming real via `EventSource`**, **Providers reais de IA**,
   **`openapi-typescript`**, **Playwright/axe-core/CI real/Docker
   executado** — mesmas pendências já registradas desde a Sprint 11/12/13.

---

**Anterior:** [20-docker-ci.md](20-docker-ci.md) · **Início:** [00-status.md](00-status.md)
