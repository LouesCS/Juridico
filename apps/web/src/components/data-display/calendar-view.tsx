'use client';

import * as React from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/empty-state';
import { addDays, endOfMonth, endOfWeek, isSameDay, isWeekend, startOfMonth, startOfWeek } from '@/lib/utils/date-range';

type CalendarMode = 'dia' | 'semana' | 'mes';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface CalendarItem {
  id: string;
  titulo: string;
}

/**
 * Genericizado no Prompt 14 (Task Engine) a partir de
 * `features/deadlines/components/calendar-view.tsx` (Sprint 08) —
 * "encontrar código semelhante: generalizar, nunca duplicar". Deadlines
 * (`Prazo`) e Tarefas (`Tarefa`) precisam da mesma navegação Dia/Semana/
 * Mês/clique-para-detalhe; a única diferença real é QUAL campo é a data e
 * como renderizar o "pill"/detalhe — por isso os 3 acessores (`getDate`,
 * `isDone`/`isUrgent`, `renderDetail`) em vez de duas implementações
 * quase idênticas. `Prazo`/`Tarefa` não modelam duração (só uma data
 * pontual) — arrastar para reagendar/redimensionar continua fora do
 * escopo (nenhum campo de "fim" para redimensionar contra).
 */
export function CalendarView<T extends CalendarItem>({
  items,
  isLoading,
  getDate,
  isDone,
  isUrgent,
  renderDetail,
  getSubtitle,
  renderRowExtra,
  emptyDayLabel = 'Sem itens',
  emptyDetailTitle = 'Sem itens neste dia',
}: {
  items: T[];
  isLoading: boolean;
  getDate: (item: T) => string | Date;
  isDone?: (item: T) => boolean;
  isUrgent?: (item: T) => boolean;
  renderDetail: (item: T) => React.ReactNode;
  getSubtitle?: (item: T) => string | null;
  renderRowExtra?: (item: T) => React.ReactNode;
  emptyDayLabel?: string;
  emptyDetailTitle?: string;
}) {
  const [mode, setMode] = React.useState<CalendarMode>('mes');
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState<T | null>(null);

  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = new Date(getDate(item)).toDateString();
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function itemsFor(day: Date): T[] {
    return itemsByDay.get(day.toDateString()) ?? [];
  }

  function navigate(direction: 1 | -1) {
    setCursor((prev) => {
      if (mode === 'dia') return addDays(prev, direction);
      if (mode === 'semana') return addDays(prev, direction * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Período anterior">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Próximo período">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <p className="ml-2 text-sm font-medium">
            {cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as CalendarMode)}>
          <TabsList>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'mes' && (
        <MonthGrid cursor={cursor} itemsFor={itemsFor} onSelect={setSelected} isDone={isDone} isUrgent={isUrgent} />
      )}
      {mode === 'semana' && (
        <WeekAgenda
          cursor={cursor}
          itemsFor={itemsFor}
          onSelect={setSelected}
          isDone={isDone}
          isUrgent={isUrgent}
          emptyDayLabel={emptyDayLabel}
        />
      )}
      {mode === 'dia' && (
        <DayAgenda
          cursor={cursor}
          itemsFor={itemsFor}
          onSelect={setSelected}
          getSubtitle={getSubtitle}
          renderRowExtra={renderRowExtra}
          emptyDetailTitle={emptyDetailTitle}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.titulo}</DialogTitle>
              </DialogHeader>
              {renderDetail(selected)}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventPill<T extends CalendarItem>({
  item,
  onSelect,
  isDone,
  isUrgent,
}: {
  item: T;
  onSelect: (item: T) => void;
  isDone?: (item: T) => boolean;
  isUrgent?: (item: T) => boolean;
}) {
  const done = isDone?.(item) ?? false;
  const urgent = isUrgent?.(item) ?? false;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors hover:opacity-80 ${
        done
          ? 'bg-muted text-muted-foreground line-through'
          : urgent
            ? 'bg-destructive/15 text-destructive'
            : 'bg-primary/10 text-primary'
      }`}
    >
      {item.titulo}
    </button>
  );
}

function MonthGrid<T extends CalendarItem>({
  cursor,
  itemsFor,
  onSelect,
  isDone,
  isUrgent,
}: {
  cursor: Date;
  itemsFor: (day: Date) => T[];
  onSelect: (item: T) => void;
  isDone?: (item: T) => boolean;
  isUrgent?: (item: T) => boolean;
}) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dayItems = itemsFor(day);
        const isCurrentMonth = day.getMonth() === cursor.getMonth();
        return (
          <Card
            key={day.toISOString()}
            className={`min-h-24 gap-0 py-2 transition-colors ${!isCurrentMonth ? 'opacity-40' : ''} ${
              isWeekend(day) ? 'bg-muted/40' : ''
            } ${isSameDay(day, today) ? 'ring-2 ring-primary' : ''}`}
          >
            <CardContent className="space-y-1 px-2">
              <p className={`text-xs ${isSameDay(day, today) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </p>
              {dayItems.slice(0, 3).map((item) => (
                <EventPill key={item.id} item={item} onSelect={onSelect} isDone={isDone} isUrgent={isUrgent} />
              ))}
              {dayItems.length > 3 && (
                <p className="text-xs text-muted-foreground">+{dayItems.length - 3} mais</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WeekAgenda<T extends CalendarItem>({
  cursor,
  itemsFor,
  onSelect,
  isDone,
  isUrgent,
  emptyDayLabel,
}: {
  cursor: Date;
  itemsFor: (day: Date) => T[];
  onSelect: (item: T) => void;
  isDone?: (item: T) => boolean;
  isUrgent?: (item: T) => boolean;
  emptyDayLabel: string;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const dayItems = itemsFor(day);
        return (
          <Card
            key={day.toISOString()}
            className={`gap-0 py-2 ${isWeekend(day) ? 'bg-muted/40' : ''} ${isSameDay(day, today) ? 'ring-2 ring-primary' : ''}`}
          >
            <CardContent className="space-y-1 px-2">
              <p className="text-xs font-medium">
                {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
              </p>
              {dayItems.length === 0 && <p className="text-xs text-muted-foreground">{emptyDayLabel}</p>}
              {dayItems.map((item) => (
                <EventPill key={item.id} item={item} onSelect={onSelect} isDone={isDone} isUrgent={isUrgent} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DayAgenda<T extends CalendarItem>({
  cursor,
  itemsFor,
  onSelect,
  getSubtitle,
  renderRowExtra,
  emptyDetailTitle,
}: {
  cursor: Date;
  itemsFor: (day: Date) => T[];
  onSelect: (item: T) => void;
  getSubtitle?: (item: T) => string | null;
  renderRowExtra?: (item: T) => React.ReactNode;
  emptyDetailTitle: string;
}) {
  const dayItems = itemsFor(cursor);

  if (dayItems.length === 0) {
    return <EmptyState icon={CalendarIcon} title={emptyDetailTitle} description="Nada agendado para esta data." />;
  }

  return (
    <ul className="space-y-2">
      {dayItems.map((item) => {
        const subtitle = getSubtitle?.(item);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.titulo}</p>
                {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              {renderRowExtra?.(item)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
