# Task Engine — Documentação Completa (Prompt 14)

> Motor de produtividade do Quilombo Dev — não uma lista de tarefas, um
> sistema completo de Kanban, Calendário, Templates, Checklist,
> Dependências, Recorrência, Vínculos multi-entidade, Timeline automática,
> IA e Busca. Este documento cobre backend (`apps/api/src/modules/tasks/`)
> e frontend (`apps/web/src/features/tasks/`) juntos. Para o changelog
> técnico detalhado de cada lado, ver
> [`docs/backend-implementation/23-task-engine.md`](backend-implementation/23-task-engine.md)
> e [`docs/frontend-implementation/00-status.md §0.5.12`](frontend-implementation/00-status.md).

## 1. Princípio norteador: reaproveitar, nunca duplicar

Antes de criar qualquer campo ou entidade, o Task Engine verifica se o
Configuration Engine (Prompt 13) já parametriza o conceito. Nenhum "Status"
ou "Prioridade" é um enum fixo: ambos são Conjuntos de Valores
auto-provisionados na primeira tarefa de cada escritório. Categorias e
Modelos de Tarefa, que existiam apenas como catálogo administrável desde o
Prompt 13, ganham aqui seu primeiro consumidor de negócio real.

```mermaid
flowchart LR
    subgraph CE["Configuration Engine (Prompt 13)"]
        CV["ConjuntoValores /\nConjuntoValorItem"]
        CAT["CategoriaTarefa"]
        MOD["ModeloTarefa"]
        FER["Feriado"]
        GRP["GrupoColaboradores"]
    end
    subgraph TE["Task Engine (Prompt 14)"]
        T["Tarefa"]
    end
    subgraph PE["Permission Engine (Prompt 12)"]
        PERM["task:* permissions"]
    end
    subgraph XCUT["Cross-cutting (generalizado pela 3ª/4ª vez)"]
        TL["Timeline"]
        AI["AI Orchestration"]
        SRCH["Universal Search"]
    end

    CV -- "Status / Prioridade (auto-provisionado)" --> T
    CAT -- "categoriaId" --> T
    MOD -- "criar a partir de modelo" --> T
    FER -- "pular fins de semana/feriados na recorrência" --> T
    GRP -- "grupoColaboradoresId" --> T
    PERM -- "resolveTaskReadScope / RequirePermission" --> T
    T -- "todo evento auto-registrado" --> TL
    T -- "Resumo / Checklist / Próximos passos / Descrição / Contexto" --> AI
    T -- "10º adapter" --> SRCH
```

## 2. Diagrama de entidades

```mermaid
erDiagram
    Tarefa ||--o{ TarefaChecklistItem : "checklist"
    Tarefa ||--o{ TarefaResponsavelAuxiliar : "responsaveisAuxiliares"
    Tarefa ||--o{ TarefaVinculo : "vinculos"
    Tarefa ||--o{ TarefaFavorito : "favoritos"
    Tarefa ||--o{ TarefaDependencia : "dependencias (dependeDeId)"
    Tarefa ||--o{ TarefaDependencia : "bloqueando (tarefaId)"
    Tarefa }o--|| TarefaRecorrencia : "recorrenciaId"
    Tarefa }o--o| Tarefa : "tarefaOrigemId (instância recorrente)"
    Tarefa }o--o| CategoriaTarefa : "categoriaId"
    Tarefa }o--o| ConjuntoValorItem : "statusId"
    Tarefa }o--o| ConjuntoValorItem : "prioridadeId"
    Tarefa }o--o| ModeloTarefa : "modeloOrigemId"
    Tarefa ||--o{ EventoTimeline : "tarefaId"
    Tarefa ||--o{ ResumoIA : "tarefaId"
    Tarefa ||--o{ Comentario : "tarefaId"

    Tarefa {
        uuid id
        uuid escritorioId
        string titulo
        string descricao
        uuid categoriaId "solta, sem FK formal"
        uuid statusId "solta — Conjunto de Valores"
        uuid prioridadeId "solta — Conjunto de Valores"
        uuid responsavelPrincipalId "solta"
        uuid equipeId "solta"
        uuid grupoColaboradoresId "solta"
        date dataInicio
        date dataVencimento
        datetime concluidaEm "estrutural, não configurável"
        datetime canceladaEm "estrutural"
        datetime arquivadaEm "estrutural"
        uuid recorrenciaId
        uuid tarefaOrigemId
    }
```

**Por que colunas soltas (sem `@relation` Prisma) para
`responsavelPrincipalId`/`equipeId`/`grupoColaboradoresId`/`categoriaId`/
`statusId`/`prioridadeId`/`modeloOrigemId`?** Porque
`Processo.responsavelPrincipalId`/`ProcessoMembro.membroId` já
estabeleceram esse padrão desde o Prompt 7 — módulos desacoplados,
validação em `task-validation.ts` na escrita, resolução via
`PrismaService` puro na leitura. Nenhum import de módulo Nest entre Tasks
e Configuration/Membros/Equipes.

## 3. Fluxos principais

### 3.1 Criar tarefa (com checklist e recorrência opcionais)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as TaskFormDialog
    participant API as POST /tasks
    participant VS as TaskValueSetsService
    participant TL as TimelineRecorderService

    U->>F: preenche título, categoria, responsável, checklist, recorrência
    F->>API: POST /tasks
    API->>API: validateTaskReferences (categoria/status/prioridade/responsável/equipe/grupo no mesmo escritório)
    alt statusId/prioridadeId omitidos
        API->>VS: ensureStatusValueSet / ensurePrioridadeValueSet
        VS-->>API: primeiro item do Conjunto (auto-provisionado se necessário)
    end
    API->>API: cria Tarefa + TarefaRecorrencia (se houver) + checklist + vínculos + dependências
    API->>TL: record(CRIACAO_TAREFA)
    API-->>F: { id }
    F-->>U: toast "Tarefa criada" + fecha diálogo
```

### 3.2 Concluir tarefa — "teto de bloqueio"

```mermaid
flowchart TD
    A["POST /tasks/:id/complete"] --> B{"Dependência\npendente?"}
    B -- Sim --> C["409 TASK_DEPENDENCIES_PENDING"]
    B -- Não --> D{"Checklist\nobrigatório\npendente?"}
    D -- Sim --> E["409 TASK_CHECKLIST_PENDING"]
    D -- Não --> F["concluidaEm = now()"]
    F --> G["record(CONCLUSAO_TAREFA)"]
    G --> H{"Tem recorrência\ne dataVencimento?"}
    H -- Sim --> I["computeNextOccurrence()\n(pula fins de semana/feriados\nse respeitarDiasUteis)"]
    I --> J["cria próxima instância\ntarefaOrigemId = tarefa atual"]
    J --> K["record(CRIACAO_TAREFA) na nova instância"]
    H -- Não --> L["200 { proximaOcorrenciaId: null }"]
    K --> M["200 { proximaOcorrenciaId }"]
```

Item de checklist **opcional** nunca bloqueia — só `obrigatorio: true` +
`concluidoEm: null` entra na verificação.

### 3.3 Kanban — arrastar entre colunas

```mermaid
sequenceDiagram
    participant U as Usuário
    participant K as TaskKanbanPage
    participant API as POST /tasks/:id/move

    U->>K: arrasta cartão (dragstart → dataTransfer.setData(id))
    U->>K: solta em outra coluna (dragover.preventDefault + drop)
    K->>API: POST /tasks/:id/move { statusId: coluna.id }
    API->>API: valida que statusId pertence ao mesmo escritório
    API->>API: record(ALTERACAO_STATUS)
    API-->>K: 204
    K->>K: invalida lista → refetch → cartão migra de coluna
```

Drag-and-drop usa a API nativa do navegador (`draggable`,
`dragstart`/`dragover`/`drop`) — zero biblioteca nova, mesma disciplina
anti-dependência de todas as rodadas anteriores.

## 4. Menu e rotas do frontend

| Item do menu | Rota | Componente |
|---|---|---|
| Minhas Tarefas | `/tarefas/minhas` | `TaskListPage scope="meus"` |
| Equipe | `/tarefas/equipe` | `TaskListPage scope="equipe"` |
| Kanban | `/tarefas/kanban` | `TaskKanbanPage` |
| Calendário | `/tarefas/calendario` | `TaskCalendarPage` (reaproveita `CalendarView` genérico) |
| Templates | `/configuracoes/modelos-tarefa` | `TaskTemplatesPage` (Configuration Engine, reaproveitado) |
| Categorias | `/configuracoes/categorias-tarefas` | `TaskCategoriesPage` (idem) |
| Relatórios | `/tarefas/relatorios` | `ModulePlaceholderPage` (honesto, sem dado simulado) |
| *(detalhe)* | `/tarefas/[id]` | `TaskDetailPage` — 7 abas |

`/tarefas` (bare) faz `redirect('/tarefas/minhas')`. "Templates" e
"Categorias" apontam para as rotas do Configuration Engine que já existiam
— nenhuma tela nova duplicada só para viver sob o grupo "TAREFAS" do menu.

### 4.1 Abas da página de detalhe

| Aba | Conteúdo |
|---|---|
| Detalhes | Descrição, categoria, responsável, datas, recorrência, origem (se instância recorrente), responsáveis auxiliares |
| Checklist | Itens com toggle de conclusão, badge "Obrigatório", adicionar/remover |
| Dependências | "Esta tarefa depende de" (com badge Pendente/Concluída) + "Bloqueando" (somente leitura) |
| Vínculos | Cliente/Processo/Documento (link real) + 6 tipos catálogo-apenas (chip com ID) |
| Timeline | Somente leitura — todo evento automático da tarefa |
| Comentários | Criar/listar (sem edição/exclusão/menções) |
| IA | `AiSummaryPanel` com as 5 ações: Resumo, Gerar checklist, Próximos passos, Gerar descrição, Explicar contexto |

## 5. Matriz de permissões

| Permissão | Escopo | Onde é exigida |
|---|---|---|
| `task:create` | — | Criar tarefa, criar a partir de modelo, duplicar |
| `task:read:all` | ALL | Lê qualquer tarefa do escritório |
| `task:read:team` | TEAM | Lê tarefas da própria equipe |
| `task:read:assigned` | ASSIGNED | Permissão mínima — toda rota de leitura a exige |
| `task:update` | — | Editar, mover, checklist, dependências, vínculos, ciclo de vida |
| `task:delete` | — | Excluir, restaurar |
| `task:team:manage` | — | Adicionar/remover responsável auxiliar |
| `comment:create` | — | Comentar (permissão pré-existente, reaproveitada, não duplicada) |

O gate de rota sempre usa a permissão de escopo mais fraca
(`task:read:assigned`); o filtro de fato (qual conjunto de tarefas volta)
é resolvido por `resolveTaskReadScope`/`buildTaskScopeWhere`
(`task-scope.ts`, mirror exato de `case-scope.ts`).

## 6. Boas práticas seguidas nesta rodada

1. **Nunca um enum fixo onde o Configuration Engine já resolve** —
   Status/Prioridade são sempre `{id, valor}`, nunca uma string literal.
2. **Colunas soltas para referências cross-módulo**, validadas na escrita
   (`task-validation.ts`), nunca uma FK Prisma formal — mesmo padrão de
   `Processo` desde o Prompt 7.
3. **Generalizar em vez de duplicar**: Timeline, IA, Busca e (no
   frontend) `CalendarView`/`FavoriteButton` foram estendidos, nunca
   reimplementados.
4. **Timestamps estruturais ≠ status configurável**: `concluidaEm`/
   `canceladaEm`/`arquivadaEm` nunca dependem do texto de um Conjunto de
   Valores que o tenant pode renomear ou excluir a qualquer momento.
5. **Recorrência sem inventar infraestrutura**: função pura e síncrona,
   porque este projeto não tem fila (BullMQ) — nenhuma fila fake criada só
   para parecer "completo".
6. **Escopo pragmático, documentado, nunca escondido**: ciclo transitivo
   de dependências, busca real de vínculo, Comments completo e
   Relatórios ficaram fora desta rodada — cada um com uma linha própria em
   "Pendências", nunca simulado como pronto.
7. **Zero dependência nova**: drag-and-drop nativo, nenhum date-picker/
   command-menu de terceiros.

## 7. Casos de uso

- **Advogado cria uma tarefa vinculada a um processo** a partir do botão
  "Nova tarefa" nas Ações Rápidas de `LegalCaseDetailPage` — a tarefa já
  nasce com `vinculos: [{tipoRecurso: 'PROCESSO', recursoId}]`.
- **Gestor cria uma tarefa recorrente semanal** ("Enviar relatório"),
  marcando "Repetir esta tarefa" → Semanalmente → "Pular fins de semana e
  feriados". Toda vez que a instância atual é concluída, a próxima nasce
  automaticamente com a mesma configuração.
- **Assistente usa um Modelo** ("Contestação Padrão") para criar uma
  tarefa já com categoria, prioridade e checklist padrão preenchidos,
  ajustando só o responsável e a data de vencimento.
- **Equipe organiza o dia a dia no Kanban**, arrastando cartões entre
  colunas que refletem exatamente os Conjuntos de Valores configurados
  para o escritório (nunca "A Fazer/Em Andamento/Concluído" fixos no
  código).
- **Uma tarefa não pode ser fechada** porque depende de outra ainda
  pendente ou tem um item de checklist obrigatório sem marcar — o usuário
  vê o motivo exato via toast, nunca um erro genérico.
- **Solicitar à IA** um resumo, um checklist sugerido, os próximos passos,
  uma descrição ou o contexto da tarefa — respeitando o mesmo escopo de
  leitura (`task-scope.ts`) de quem está pedindo.

## 8. Pendências conhecidas (ver documentos de changelog para o detalhe completo)

1. Detecção de ciclo transitivo em dependências (só o ciclo direto de 2
   nós é bloqueado).
2. Busca/autocomplete real na aba Vínculos (hoje aceita colar o ID).
3. Comments completo (edição/exclusão/menções).
4. Relatórios de produtividade/SLA.
5. Entidade `Equipe` (departamento) sem CRUD próprio — `equipeId`
   continua uma coluna solta sem seletor no formulário.

---

**Ver também:** [backend-implementation/23-task-engine.md](backend-implementation/23-task-engine.md) ·
[frontend-implementation/00-status.md §0.5.12](frontend-implementation/00-status.md) ·
[backend-implementation/22-configuration-engine.md](backend-implementation/22-configuration-engine.md)
