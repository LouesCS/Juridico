# 20 — Contexto Oficial para a Próxima Rodada

## CONTEXTO OFICIAL (após a Sprint 15 / Prompt 14)

**Escopo acumulado.** Prompt 6A: Identity, Offices, Memberships, Health,
multi-tenancy, RLS/migrations escritas (não aplicadas). Prompt 5C
(continuação): Auditoria, RLS e migrations de busca. Prompt 7: Clients e
Legal Cases. Sprint 08: Deadlines e Timeline. Sprint 09: Documents e
Folders. Sprint 10: Universal Search. Sprint 11: Assistente Jurídico
Inteligente (AI Orchestration Layer). Sprint 12/Prompt 11: Reorganização
da Navegação (só frontend). Sprint 13/Prompt 12: Permission Engine.
Sprint 14/Prompt 13: Configuration Engine. **Sprint 15/Prompt 14 (esta
rodada): Task Engine** — motor de produtividade completo (CRUD, Kanban,
Calendário, Templates, Categorias, Checklist, Dependências, Recorrência,
Vínculos, Timeline, IA, Busca), consumindo Configuration Engine para
Status/Prioridade/Categoria/Modelo/Feriado em vez de reinventar — ver
`docs/backend-implementation/23-task-engine.md` (documento dedicado) e
`§0.3.9` de `00-status.md` para o resumo do que mudou.

**Como rodar localmente.** Mesmo procedimento das rodadas anteriores —
ver `docs/backend-implementation/00-status.md`. `npx jest` roda sem
Postgres (**483/483 testes**, era 402/402). Migration nova
(`20260804000000_task_engine`) escrita mas nunca aplicada contra Postgres
real (sem Docker/Postgres neste ambiente, mesma limitação de sempre).
`AI_PROVIDER=fake` (default) continua valendo, inalterado.

**O que foi implementado nesta rodada** (resumo — detalhe completo em
`23-task-engine.md`):

- **`modules/tasks/`** (novo): CRUD completo de `Tarefa` + ciclo de vida
  (archive/restore/duplicate/move/reopen/complete/cancel), checklist,
  dependências (bloqueio de conclusão via `TASK_DEPENDENCIES_PENDING`/
  `TASK_CHECKLIST_PENDING`), recorrência síncrona (função pura, sem fila —
  BullMQ não existe neste projeto), vínculos multi-entidade (9 tipos, 3
  validados de verdade), favoritos, comentários mínimos, "criar a partir
  de modelo", dashboard agregado, `GET /tasks/:id/timeline` (leitura).
- **Status/Prioridade nunca são enum fixo** — `TaskValueSetsService`
  auto-provisiona 2 Conjuntos de Valores por escritório (Configuration
  Engine, Prompt 13) na primeira criação de tarefa.
- **Categorias/Modelos de Tarefa (Prompt 13, catálogo-apenas até agora)
  ganham seu primeiro consumidor real.**
- **Generalizações (3ª/4ª vez do mesmo padrão aditivo)**: `EventoTimeline`
  e `ResumoIA`/`FonteIA` ganham `tarefaId`; `TaskSearchAdapter` é o 10º
  adapter da Busca Global.
- **7 permissões novas**: `task:create`, `task:read:all`, `task:read:team`,
  `task:read:assigned`, `task:update`, `task:delete`, `task:team:manage`.
- **2 códigos de erro novos**: `TASK_DEPENDENCIES_PENDING` (409),
  `TASK_CHECKLIST_PENDING` (409).
- Migration nova `20260804000000_task_engine` (7 tabelas, 2 enums, 100%
  aditiva) + alterações aditivas em `eventos_timeline`/`resumos_ia`/
  `fontes_ia`/`comentarios` (todas nullable novo/coluna nova, nenhuma
  quebra de contrato existente).

**Exclusões conscientes desta rodada** (mesmo padrão de escopo pragmático
de todas as anteriores — ver `23-task-engine.md §23.9`):

1. Detecção de ciclo transitivo em dependências — só o ciclo direto de 2
   nós é bloqueado.
2. Comentários de Tarefa sem edição/exclusão/menções — mesma pendência de
   Comments desde a Sprint 09.
3. Vínculo sem busca/autocomplete real para os 9 tipos de recurso.
4. Relatórios de produtividade/SLA — não implementados.
5. Entidade `Equipe` (departamento) continua sem endpoint de CRUD próprio.

**Pendências priorizadas para a próxima rodada:**

1. **Detecção de ciclo transitivo** em dependências de tarefa.
2. **Módulo Comments completo** (edição/exclusão/menções) — agora com um
   3º consumidor mínimo (Tarefa), além de Processo/Documento.
3. **Módulo Financeiro real**, consumindo `financeiro:*` (Prompt 12) e
   `configuracoes.financeiro` (Prompt 13) — pendência ainda não endereçada.
4. **Relatórios de Tarefas** (produtividade, SLA, carga por equipe).
5. **Módulo `Equipe`** (departamento) — CRUD próprio, hoje só uma coluna
   solta em `Processo`/`Tarefa`.
6. Conectar Campos Extras/Obrigatórios aos formulários reais de
   Cliente/Processo e Feriados ao cálculo de prazos em dias úteis
   (pendência do Prompt 13, ainda não endereçada).
7. **Auditoria de negativas por recurso** — pendência já registrada desde
   o Prompt 12, inalterada.
8. **Pipeline de extração de texto (BullMQ)**, **Providers reais de IA**,
   **Histórico de chat persistido**, **Failover automático entre
   providers**, **Migrations executáveis, testes de integração/E2E, CI,
   Docker executado** — mesmas pendências já registradas desde a
   Sprint 11, inalteradas.

---

**Anterior:** [19-decisions.md](19-decisions.md) · **Início:** [00-status.md](00-status.md)
