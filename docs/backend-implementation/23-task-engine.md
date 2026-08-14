# 23 — Task Engine (Prompt 14)

> Este documento descreve o motor de produtividade do Quilombo Dev — não
> uma lista de tarefas, mas um sistema completo com Kanban, Calendário,
> Templates, Categorias, Checklist, Dependências, Recorrência, Vínculos
> multi-entidade, Timeline automática, IA e Busca Global. Nenhum campo
> "Status"/"Prioridade" é um enum fixo — ambos são Conjuntos de Valores do
> Configuration Engine (Prompt 13), auto-provisionados no primeiro uso de
> cada escritório. Categorias e Modelos de Tarefa (catálogo-apenas desde o
> Prompt 13) ganham aqui seu **primeiro consumidor real**.

## 23.1 Por que reaproveitar, nunca duplicar

Antes de criar qualquer entidade nova, o Prompt 14 exige verificar se o
Configuration Engine já parametriza o conceito. Resultado:

| Conceito | Fonte | Nunca vira |
|---|---|---|
| Status de Tarefa | `ConjuntoValores`/`ConjuntoValorItem`, nome fixo `"Status de Tarefa"`, auto-provisionado por `TaskValueSetsService.ensureStatusValueSet` | Enum Prisma |
| Prioridade de Tarefa | Idem, `"Prioridade de Tarefa"` | Enum Prisma |
| Categoria | `CategoriaTarefa` (Prompt 13, catálogo-apenas até agora) | Nova tabela |
| Modelo | `ModeloTarefa` (Prompt 13, catálogo-apenas até agora) | Nova tabela |
| Feriados/dias úteis | `Feriado` (Prompt 13) consumido por `task-recurrence.ts` | Cálculo próprio |
| Grupo de colaboradores | `GrupoColaboradores` (Prompt 13) — `Tarefa.grupoColaboradoresId` é coluna solta, mesmo padrão de `Processo.equipeId` | Tabela de vínculo própria |
| Timeline | `EventoTimeline`/`TimelineRecorderService` (Sprint 08) generalizado pela 3ª vez (Processo → Documento/Cliente → Tarefa) | Tabela de log própria |
| Resumo por IA | `ResumoIA`/`FonteIA` (Sprint 11) generalizado pela 4ª vez | Pipeline de IA próprio |
| Comentários | `Comentario` (schema desde a Fase 1, nunca implementado) — Tarefa é o 3º consumidor (Processo/Documento continuam com placeholder) | Tabela própria |
| Busca | `TaskSearchAdapter`, 10º adapter de `UniversalSearchUseCase` (Sprint 10) | Endpoint de busca próprio |
| Permissões | `RequirePermission`/`hasPermission` (Prompt 12), 7 chaves novas seguindo o padrão `task:*` | Guard próprio |

## 23.2 Arquitetura

```
apps/api/src/modules/tasks/
  tasks.module.ts                 importa só TimelineModule
  application/
    task-scope.ts                 resolveTaskReadScope/buildTaskScopeWhere (mirror de case-scope.ts)
    task-validation.ts             valida categoria/status/prioridade/responsável/equipe/grupo no mesmo escritório
    task-value-sets.service.ts     auto-provisiona Status/Prioridade (Conjuntos de Valores)
    task-recurrence.ts             computeNextOccurrence — função pura, sem fila (BullMQ não existe no projeto)
    use-cases/
      create-task, get-task, update-task, delete-task, list-tasks
      task-lifecycle (Archive/Restore/Duplicate/Move/Reopen/Complete/Cancel)
      task-checklist, task-dependencies, task-links, task-responsibles, task-favorites, task-comments
      create-task-from-template, get-task-config, task-dashboard, list-task-timeline
  presentation/
    schemas/task.schemas.ts
    tasks.controller.ts + task-checklist/dependencies/links/responsibles/comments/timeline.controller.ts (6 controllers, todos sob /tasks/*)
```

Colunas soltas, sem `@relation` Prisma formal, exatamente como
`Processo.responsavelPrincipalId`/`ProcessoMembro.membroId` já faziam:
`responsavelPrincipalId`, `equipeId`, `grupoColaboradoresId`, `categoriaId`,
`statusId`, `prioridadeId`, `modeloOrigemId` — validadas em
`task-validation.ts` na escrita, resolvidas em `PrismaService` puro na
leitura. Nenhum import de módulo Nest entre Tasks e
Configuration/Membros/Equipes.

## 23.3 Entidades novas

`Tarefa` (campos principais: `titulo`/`descricao`/`categoriaId`/`statusId`/
`prioridadeId`/`responsavelPrincipalId`/`equipeId`/`grupoColaboradoresId`/
`dataInicio`/`dataVencimento`/`recorrenciaId`/`tarefaOrigemId`/
`criadoPorId` + timestamps estruturais `concluidaEm`/`canceladaEm`/
`motivoCancelamento`/`arquivadaEm`, deliberadamente separados do `statusId`
configurável — ver §23.5), `TarefaRecorrencia`, `TarefaChecklistItem`,
`TarefaResponsavelAuxiliar`, `TarefaDependencia` (auto-relação
`dependeDeId`/`tarefaId`), `TarefaVinculo`, `TarefaFavorito`. Dois enums
novos: `TipoVinculoTarefa` (9 valores: CLIENTE/PROCESSO/DOCUMENTO/
CONTRATO/SERVICO/FINANCEIRO/PUBLICACAO/PEDIDO/REGISTRO_TRABALHO) e
`FrequenciaRecorrencia` (DIARIA/SEMANAL/MENSAL/ANUAL/DIAS_UTEIS/
DIAS_ESPECIFICOS).

Migration `20260804000000_task_engine` — 100% aditiva (`ALTER TYPE ADD
VALUE` em 3 enums existentes, `CREATE TYPE`/`CREATE TABLE` para o resto,
`ALTER TABLE ... ADD COLUMN`/`DROP NOT NULL` nas 3 tabelas generalizadas),
nunca aplicada contra Postgres real nesta etapa — mesma limitação de
ambiente de todas as rodadas anteriores.

## 23.4 Generalizações (3ª e 4ª vez do mesmo padrão)

- **Timeline**: `EventoTimeline.processoId` virou nullable, `+tarefaId`
  `+escopoTipo` (`EscopoEventoTimeline`: PROCESSO/TAREFA).
  `TimelineRecorderService.record()` aceita `tarefaId` opcional (exatamente
  um entre `processoId`/`tarefaId` por chamada). `ListTaskTimelineUseCase`
  (novo, mais simples que `ListCaseTimelineUseCase` — Tarefa não tem uma
  projeção somente-leitura equivalente a `Prazo` para mesclar) expõe `GET
  /tasks/:id/timeline`, só leitura (sem criação de anotação manual para
  Tarefa nesta rodada — mesma decisão de escopo de Comentários, ver
  §23.4.1).
- **IA**: `ResumoIA`/`FonteIA` ganham `tarefaId` opcional; `EscopoResumoIA`
  `+TAREFA`; `TipoResumoIA` ganha 5 valores (`TAREFA_RESUMO`/
  `TAREFA_CHECKLIST`/`TAREFA_PROXIMOS_PASSOS`/`TAREFA_DESCRICAO`/
  `TAREFA_CONTEXTO`) — as 5 ações de IA pedidas pelo Prompt 14. Novo
  `TaskContextBuilder` (mirror de `CaseContextBuilder`), `assertResumoAccess`
  ganha um 4º branch reaproveitando `task-scope.ts`.
- **Busca**: `TaskSearchAdapter` (10º adapter), `'tasks'` adicionado a
  `SearchResultType`/`GROUP_ORDER` logo após `'deadlines'`.

### 23.4.1 Comentários — escopo mínimo intencional

`Comentario` ganha `tarefaId` nullable. Só `ListTaskCommentsUseCase`/
`CreateTaskCommentUseCase` foram implementados (gated pela permissão já
existente `comment:create`, nunca duplicada) — sem edição, exclusão ou
menções, mesma pendência de módulo Comments completo já registrada desde a
Sprint 09 em `19-decisions.md`.

## 23.5 Regras de negócio

**Status configurável × ciclo de vida estrutural, deliberadamente
ortogonais.** `statusId` é um rótulo/coluna do Kanban, livremente
renomeável/excluível pelo tenant em `/configuracoes/conjuntos-valores`.
`concluidaEm`/`canceladaEm`/`arquivadaEm` são timestamps estruturais que o
próprio motor controla — Dashboard, bloqueio de conclusão e Kanban nunca
dependem do texto de um status configurável.

**"Teto de bloqueio" de conclusão** (`CompleteTaskUseCase`): não é possível
concluir uma tarefa com (a) dependência pendente
(`TASK_DEPENDENCIES_PENDING`, 409) ou (b) item de checklist **obrigatório**
não concluído (`TASK_CHECKLIST_PENDING`, 409). Item opcional nunca bloqueia.

**Recorrência sem fila.** Este projeto não tem BullMQ/cron. `task-recurrence.ts`
é uma função pura (`computeNextOccurrence`) chamada de forma síncrona
dentro de `CompleteTaskUseCase` — ao concluir uma tarefa com
`recorrenciaId` + `dataVencimento`, a próxima ocorrência é criada na
mesma transação lógica, consumindo `Feriado` (Configuration Engine) para
pular fins de semana/feriados quando `respeitarDiasUteis` está ativo.

**Dependências — ciclo detectado só no caso trivial.** `AddDependencyUseCase`
rejeita auto-dependência e o ciclo direto de 2 nós (A depende de B, B
tentando depender de A); detecção de ciclo transitivo (A→B→C→A) foi
conscientemente deixada de fora desta rodada — documentado no código.

**Vínculos com validação parcial.** `CLIENTE`/`PROCESSO`/`DOCUMENTO` são
validados de verdade (existência real no escritório); os outros 6 tipos
(`CONTRATO`/`SERVICO`/`FINANCEIRO`/`PUBLICACAO`/`PEDIDO`/
`REGISTRO_TRABALHO`) são aceitos sem validação — não há módulo de negócio
ainda para validar contra, mesmo tratamento de `financeiro:*` desde o
Prompt 12.

## 23.6 Permissões novas

| Permissão | Escopo | Uso |
|---|---|---|
| `task:create` | — | `POST /tasks`, `POST /tasks/from-template`, `POST /tasks/:id/duplicate` |
| `task:read:all` | ALL | Lê qualquer tarefa do escritório |
| `task:read:team` | TEAM | Lê tarefas da própria equipe (`Membro.equipeId`) |
| `task:read:assigned` | ASSIGNED | Lê só tarefas onde é responsável (principal ou auxiliar) — permissão mínima que toda rota de leitura exige |
| `task:update` | — | PATCH, lifecycle actions, checklist/dependencies/links |
| `task:delete` | — | DELETE, restore |
| `task:team:manage` | — | Add/remove responsável auxiliar (mirror de `case:team:manage`) |

Concedidas por padrão a OWNER/ADMIN/SOCIO; GESTOR ganha o conjunto
completo; ADVOGADO ganha create/update/delete/team:manage +
read:assigned/read:team; ASSISTENTE ganha create/read:all/update;
ESTAGIARIO/FINANCEIRO ganham read:assigned/update.

## 23.7 Erros novos

| Código | Status | Uso |
|---|---|---|
| `TASK_DEPENDENCIES_PENDING` | 409 | `POST /tasks/:id/complete` com dependência não concluída |
| `TASK_CHECKLIST_PENDING` | 409 | `POST /tasks/:id/complete` com item obrigatório de checklist pendente |

## 23.8 Testes

81 testes novos neste Prompt (`task-recurrence` — 10 casos cobrindo todas
as frequências + pulo de fim de semana/feriado + corte por `dataFim`;
`task-scope`, `task-value-sets`, e um arquivo por use case — incluindo
`list-task-timeline.use-case.spec.ts`, adicionado numa segunda passada
para cobrir o endpoint de leitura da timeline de Tarefa). Suíte completa:
**90/90 suítes, 483/483 testes** (era 402/402 no início do Prompt 14).

## 23.9 Pendências para o Prompt 15

1. Detecção de ciclo transitivo em dependências (só o caso trivial de 2 nós
   é bloqueado hoje).
2. Menções/edição/exclusão de comentários (mesma pendência de Comments
   desde a Sprint 09, agora com um 3º consumidor mínimo).
3. Vínculo com busca/autocomplete real para os 9 tipos de recurso — hoje o
   frontend aceita colar o ID diretamente para os 6 tipos catálogo-apenas.
4. Relatórios de produtividade/SLA (nav item "Relatórios" é placeholder
   honesto, sem dado simulado).
5. Entidade `Equipe` (departamento) não tem nenhum endpoint de
   listagem/CRUD ainda — `Tarefa.equipeId` continua uma coluna solta sem
   seletor no formulário, mesma situação de `Processo.equipeId`.
6. Mesmas pendências de infraestrutura já registradas desde a Sprint 11
   (filas, providers reais de IA, migrations aplicadas, CI/Docker
   executado).

---

**Anterior:** [22-configuration-engine.md](22-configuration-engine.md) · **Início:** [00-status.md](00-status.md)
