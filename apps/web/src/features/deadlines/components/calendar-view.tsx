'use client';

import { Lock } from 'lucide-react';
import { CalendarView as GenericCalendarView } from '@/components/data-display/calendar-view';
import { StatusBadge } from '@/components/data-display/status-badge';
import type { DeadlineListItemDTO } from '../api/deadlines.api';

/**
 * Fina camada sobre `components/data-display/calendar-view.tsx`
 * (genericizado no Prompt 14/Task Engine a partir deste componente) —
 * preserva o comportamento original (ícone de cadeado para `FATAL`, link
 * do processo, responsável) sem duplicar a navegação Dia/Semana/Mês.
 */
export function CalendarView({ items, isLoading }: { items: DeadlineListItemDTO[]; isLoading: boolean }) {
  return (
    <GenericCalendarView
      items={items}
      isLoading={isLoading}
      getDate={(item) => item.dataVencimento}
      isDone={(item) => item.status === 'CONCLUIDO'}
      isUrgent={(item) => item.tipo === 'FATAL'}
      getSubtitle={(item) => item.processo.titulo}
      renderRowExtra={(item) => <StatusBadge status={item.status} />}
      emptyDayLabel="Sem prazos"
      emptyDetailTitle="Sem prazos neste dia"
      renderDetail={(selected) => (
        <>
          <p className="-mt-3 text-sm text-muted-foreground">
            {new Date(selected.dataVencimento).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge status={selected.status} />
              {selected.tipo === 'FATAL' && <Lock className="size-3.5 text-destructive" aria-hidden="true" />}
            </div>
            <div>
              <span className="text-muted-foreground">Processo: </span>
              <a href={`/processos/${selected.processo.id}`} className="hover:underline">
                {selected.processo.titulo}
              </a>
            </div>
            {selected.responsavel && (
              <div>
                <span className="text-muted-foreground">Responsável: </span>
                {selected.responsavel.nome}
              </div>
            )}
          </div>
        </>
      )}
    />
  );
}
