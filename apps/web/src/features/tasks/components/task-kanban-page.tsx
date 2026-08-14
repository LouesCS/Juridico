'use client';

import * as React from 'react';
import Link from 'next/link';
import { LayoutGrid, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FilterBar } from '@/components/data-display/filter-bar';
import { ScrollArea } from '@/components/data-display/scroll-area';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useTaskCategories } from '@/features/configuration/api/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { useCancelTask, useCompleteTask, useMoveTask, useReopenTask, useToggleTaskFavorite } from '../api/mutations';
import { useTaskConfig, useTasks } from '../api/queries';
import type { TaskListItemDTO } from '../api/tasks.api';
import { TaskFormDialog } from './task-form-dialog';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Drag and drop nativo (`HTMLElement.draggable` + eventos `dragstart`/
 * `dragover`/`drop`) — reafirma a disciplina de "nenhuma biblioteca de UI
 * nova" já seguida em todas as rodadas anteriores; nunca `@dnd-kit` ou
 * similar. Colunas vêm de `useTaskConfig().status` (Conjuntos de Valores,
 * Configuration Engine) — nunca uma lista fixa de status.
 */
function TaskCard({
  task,
  isFavoritePending,
  onToggleFavorite,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: TaskListItemDTO;
  isFavoritePending: boolean;
  onToggleFavorite: () => void;
  isDragging: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-md border border-border bg-card p-3 shadow-elevation-1 transition-all duration-150 ${isDragging ? 'scale-[0.97] opacity-40 shadow-elevation-2' : 'hover:shadow-elevation-2'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tarefas/${task.id}`} className="min-w-0 hover:underline">
          <p className="text-sm font-medium">{task.titulo}</p>
        </Link>
        <FavoriteButton
          favorito={task.favorita}
          isPending={isFavoritePending}
          label={task.favorita ? `Remover ${task.titulo} dos favoritos` : `Favoritar ${task.titulo}`}
          onToggle={onToggleFavorite}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.categoria && (
          <Badge variant="outline" style={{ borderColor: task.categoria.cor }} className="text-[10px]">
            {task.categoria.nome}
          </Badge>
        )}
        {task.prioridade && (
          <Badge variant="secondary" className="text-[10px]">
            {task.prioridade.valor}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {task.dataVencimento ? (
          <span className={`text-xs ${task.atrasada ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
            {new Date(task.dataVencimento).toLocaleDateString('pt-BR')}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sem prazo</span>
        )}
        {task.responsavel && (
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">{initials(task.responsavel.nome)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

export function TaskKanbanPage() {
  const canCreate = usePermission('task:create');
  const [escopo, setEscopo] = React.useState<'meus' | 'equipe' | 'todos'>('meus');
  const [search, setSearch] = React.useState('');
  const [categoriaId, setCategoriaId] = React.useState('TODOS');
  const [prioridadeId, setPrioridadeId] = React.useState('TODOS');
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = React.useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data: config } = useTaskConfig();
  const { data: categorias } = useTaskCategories();
  const moveTask = useMoveTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();
  const toggleFavorite = useToggleTaskFavorite();

  const { data, isLoading, isError, refetch } = useTasks({
    escopo,
    q: debouncedSearch || undefined,
    categoriaId: categoriaId === 'TODOS' ? undefined : categoriaId,
    prioridadeId: prioridadeId === 'TODOS' ? undefined : prioridadeId,
    sort: 'dataVencimento',
    limit: 200,
  });

  if (isError) {
    return (
      <div>
        <PageHeader title="Kanban de tarefas" />
        <ErrorState title="Não foi possível carregar o quadro." onRetry={() => refetch()} />
      </div>
    );
  }

  const columns = config?.status ?? [];
  const tasks = (data?.items ?? []).filter((task) => !task.arquivadaEm);
  const tasksByStatus = new Map<string, TaskListItemDTO[]>();
  const semStatus: TaskListItemDTO[] = [];
  for (const task of tasks) {
    if (task.status && columns.some((column) => column.id === task.status!.id)) {
      tasksByStatus.set(task.status.id, [...(tasksByStatus.get(task.status.id) ?? []), task]);
    } else {
      const todoColumn = columns.find((column) => column.valor === 'A Fazer');
      if (todoColumn) tasksByStatus.set(todoColumn.id, [...(tasksByStatus.get(todoColumn.id) ?? []), task]);
      else semStatus.push(task);
    }
  }

  function handleDrop(event: React.DragEvent, statusId: string) {
    event.preventDefault();
    setDragOverColumnId(null);
    const tarefaId = event.dataTransfer.getData('text/plain');
    if (!tarefaId) return;
    const task = tasks.find((t) => t.id === tarefaId);
    if (!task || task.status?.id === statusId) return;
    const destination = columns.find((column) => column.id === statusId)?.valor;
    const mutationOptions = {
      onSuccess: () => toast.success('Tarefa movida.'),
      onError: (error: unknown) => {
        const code = (error as { code?: string })?.code;
        toast.error(
          code === 'TASK_CHECKLIST_PENDING'
            ? 'Existem itens obrigatórios do checklist pendentes.'
            : code === 'TASK_DEPENDENCIES_PENDING'
              ? 'Existem dependências pendentes bloqueando esta tarefa.'
              : 'Não foi possível mover a tarefa.',
        );
      },
    };
    if (destination === 'Concluídos') {
      completeTask.mutate(tarefaId, mutationOptions);
      return;
    }
    if (destination === 'Cancelados') {
      cancelTask.mutate({ tarefaId }, mutationOptions);
      return;
    }
    if (destination === 'Fazendo' && (task.concluidaEm || task.canceladaEm)) {
      reopenTask.mutate(tarefaId, mutationOptions);
      return;
    }
    moveTask.mutate(
      { tarefaId, statusId },
      mutationOptions,
    );
  }

  return (
    <div>
      <PageHeader
        title="Kanban de tarefas"
        description="Arraste os cartões entre as colunas para atualizar o status."
        actions={canCreate ? <TaskFormDialog mode="create" /> : undefined}
      />

      <FilterBar>
        <Input
          placeholder="Buscar tarefas"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar tarefas"
          className="sm:max-w-xs"
        />
        <Select value={escopo} onValueChange={(v) => setEscopo(v as typeof escopo)}>
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por escopo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="meus">Minhas tarefas</SelectItem>
            <SelectItem value="equipe">Da minha equipe</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas as categorias</SelectItem>
            {(categorias ?? []).map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridadeId} onValueChange={setPrioridadeId}>
          <SelectTrigger className="sm:w-36" aria-label="Filtrar por prioridade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas as prioridades</SelectItem>
            {(config?.prioridade ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <div className="scrollbar-fade flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nenhuma coluna configurada" description="Configure o Conjunto de Valores de Status em Configurações." />
      ) : (
        <ScrollArea orientation="horizontal" dragToPan className="flex gap-4 pb-4">
          {columns.map((column) => {
            const columnTasks = tasksByStatus.get(column.id) ?? [];
            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumnId(column.id);
                }}
                onDragLeave={() => setDragOverColumnId((current) => (current === column.id ? null : current))}
                onDrop={(event) => handleDrop(event, column.id)}
                className={`w-72 shrink-0 rounded-md border transition-colors ${
                  dragOverColumnId === column.id ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
              >
                <Card className="h-full">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {column.valor}
                      <Badge variant="secondary" className="text-[10px]">
                        {columnTasks.length}
                      </Badge>
                    </CardTitle>
                    {canCreate && (
                      <TaskFormDialog
                        mode="create"
                        fixedStatusId={column.id}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Nova tarefa em ${column.valor}`}>
                            <Plus className="size-4" aria-hidden="true" />
                          </Button>
                        }
                      />
                    )}
                  </CardHeader>
                  <CardContent className="scrollbar-fade flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
                    {columnTasks.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma tarefa aqui.</p>
                    )}
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isFavoritePending={toggleFavorite.isPending}
                        onToggleFavorite={() => toggleFavorite.mutate(task.id)}
                        isDragging={draggingId === task.id}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', task.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                      />
                    ))}
                    {dragOverColumnId === column.id &&
                      draggingId &&
                      !columnTasks.some((task) => task.id === draggingId) && (
                        <div
                          className="transition-collapse h-12 rounded-md border-2 border-dashed border-primary/40 bg-primary/5"
                          aria-hidden="true"
                        />
                      )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
}
