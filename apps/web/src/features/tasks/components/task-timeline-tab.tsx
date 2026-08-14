'use client';

import { History } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TIMELINE_TYPE_META } from '@/features/timeline/domain/timeline-meta';
import { useTaskTimeline } from '../api/queries';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Timeline de Tarefa é só leitura (Prompt 14) — diferente de
 * `TimelineItemCard` (Processo), que permite fixar/excluir anotações
 * manuais; Tarefa não tem rota de anotação manual, então nenhum item aqui
 * é editável. Toda ação do Task Engine (criação/conclusão/cancelamento/
 * mudança de responsável-status-prioridade/comentário) já cai aqui
 * automaticamente via `TimelineRecorderService.record()`.
 */
export function TaskTimelineTab({ taskId }: { taskId: string }) {
  const { data, isLoading, isError, refetch } = useTaskTimeline(taskId, { limit: 50 });

  if (isError) return <ErrorState title="Não foi possível carregar a timeline." onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhum evento ainda"
        description="Assim que houver movimentações nesta tarefa, elas aparecerão aqui automaticamente."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = TIMELINE_TYPE_META[item.tipo];
        const Icon = meta.icon;
        const time = new Date(item.dataEvento);
        return (
          <Card key={item.id} className="flex gap-3 p-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.colorClass}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">{item.titulo}</p>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>
                  {time.toLocaleDateString('pt-BR')} às {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {item.autor && (
                  <span className="flex items-center gap-1">
                    <Avatar className="size-4">
                      <AvatarFallback className="text-[8px]">{initials(item.autor.nome)}</AvatarFallback>
                    </Avatar>
                    {item.autor.nome}
                  </span>
                )}
              </div>
              {item.descricao && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.descricao}</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
