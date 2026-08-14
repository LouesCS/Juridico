'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarView, type CalendarItem } from '@/components/data-display/calendar-view';
import { FilterBar } from '@/components/data-display/filter-bar';
import { PageHeader } from '@/components/layout/page-header';
import { useTasks } from '../api/queries';
import type { TaskListItemDTO } from '../api/tasks.api';
import { TaskFormDialog } from './task-form-dialog';

interface CalendarTask extends CalendarItem {
  task: TaskListItemDTO;
}

/**
 * Reaproveita `components/data-display/calendar-view.tsx` (genericizado no
 * Prompt 14 a partir de `features/deadlines/`) — Tarefa usa `dataVencimento`
 * como a data única do item, igual Prazo; feriados/dias úteis já entram na
 * navegação Dia/Semana/Mês da própria Configuration Engine (Prompt 13) via
 * `TarefaRecorrencia`, não precisam de tratamento especial aqui.
 */
export function TaskCalendarPage() {
  const [escopo, setEscopo] = React.useState<'meus' | 'equipe' | 'todos'>('meus');

  const { data, isLoading } = useTasks({
    escopo,
    pendentes: true,
    sort: 'dataVencimento',
    limit: 200,
  });

  const items: CalendarTask[] = (data?.items ?? [])
    .filter((task) => !!task.dataVencimento)
    .map((task) => ({ id: task.id, titulo: task.titulo, task }));

  return (
    <div>
      <PageHeader
        title="Calendário de tarefas"
        description="Tarefas pendentes com data de vencimento definida."
        actions={<TaskFormDialog mode="create" />}
      />

      <FilterBar>
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
      </FilterBar>

      <CalendarView<CalendarTask>
        items={items}
        isLoading={isLoading}
        getDate={(item) => item.task.dataVencimento!}
        isDone={(item) => !!item.task.concluidaEm}
        isUrgent={(item) => item.task.atrasada}
        getSubtitle={(item) => item.task.categoria?.nome ?? null}
        renderRowExtra={(item) =>
          item.task.prioridade ? <Badge variant="outline">{item.task.prioridade.valor}</Badge> : null
        }
        emptyDayLabel="Sem tarefas"
        emptyDetailTitle="Sem tarefas neste dia"
        renderDetail={(selected) => (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {selected.task.status && <Badge variant="secondary">{selected.task.status.valor}</Badge>}
              {selected.task.prioridade && <Badge variant="outline">{selected.task.prioridade.valor}</Badge>}
              {selected.task.categoria && (
                <Badge variant="outline" style={{ borderColor: selected.task.categoria.cor }}>
                  {selected.task.categoria.nome}
                </Badge>
              )}
            </div>
            {selected.task.responsavel && (
              <p>
                <span className="text-muted-foreground">Responsável: </span>
                {selected.task.responsavel.nome}
              </p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={`/tarefas/${selected.task.id}`}>Abrir tarefa</Link>
            </Button>
          </div>
        )}
      />
    </div>
  );
}
