'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarClock, CalendarDays, LayoutList, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { addDays, daysUntil, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, toISODate } from '@/lib/utils/date-range';
import type { DeadlineListItemDTO, DeadlinePriority } from '../api/deadlines.api';
import { useCancelDeadline, useCompleteDeadline, useDuplicateDeadline, useReopenDeadline } from '../api/mutations';
import { useDeadlines } from '../api/queries';
import { CalendarView } from './calendar-view';
import { DeadlineFormDialog } from './deadline-form-dialog';

type QuickFilter = 'todos' | 'hoje' | 'amanha' | 'semana' | 'mes' | 'vencidos' | 'concluidos';

const PRIORITY_VARIANT: Record<DeadlinePriority, 'destructive' | 'outline' | 'secondary'> = {
  CRITICA: 'destructive',
  ALTA: 'destructive',
  MEDIA: 'secondary',
  BAIXA: 'outline',
};
const PRIORITY_LABEL: Record<DeadlinePriority, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
};

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function quickFilterRange(filter: QuickFilter): { de?: string; ate?: string; status?: 'PENDENTE' | 'CONCLUIDO' } {
  const now = new Date();
  switch (filter) {
    case 'hoje':
      return { de: toISODate(startOfDay(now)), ate: toISODate(endOfDay(now)) };
    case 'amanha': {
      const amanha = addDays(now, 1);
      return { de: toISODate(startOfDay(amanha)), ate: toISODate(endOfDay(amanha)) };
    }
    case 'semana':
      return { de: toISODate(startOfWeek(now)), ate: toISODate(endOfWeek(now)) };
    case 'mes':
      return { de: toISODate(startOfMonth(now)), ate: toISODate(endOfMonth(now)) };
    case 'vencidos':
      return { ate: toISODate(endOfDay(addDays(now, -1))), status: 'PENDENTE' };
    case 'concluidos':
      return { status: 'CONCLUIDO' };
    default:
      return {};
  }
}

function DaysRemaining({ dataVencimento, status }: { dataVencimento: string; status: string }) {
  if (status === 'CONCLUIDO' || status === 'CANCELADO') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const dias = daysUntil(new Date(dataVencimento));
  if (dias < 0) return <Badge variant="destructive">{Math.abs(dias)}d atrasado</Badge>;
  if (dias === 0) return <Badge variant="destructive">Hoje</Badge>;
  if (dias === 1) return <Badge variant="secondary">Amanhã</Badge>;
  return <span className="text-sm text-muted-foreground">{dias} dias</span>;
}

export function DeadlinesPage() {
  const canCreate = usePermission('case:update');
  const [view, setView] = React.useState<'lista' | 'calendario'>('lista');
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>('todos');
  const [search, setSearch] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<DeadlinePriority | 'TODOS'>('TODOS');
  const [escopo, setEscopo] = React.useState<'meus' | 'equipe' | 'todos'>('meus');
  const debouncedSearch = useDebouncedValue(search);

  const range = quickFilterRange(quickFilter);
  const { data, isLoading, isError, refetch } = useDeadlines({
    escopo,
    q: debouncedSearch || undefined,
    prioridade: priorityFilter === 'TODOS' ? undefined : priorityFilter,
    dataVencimentoDe: range.de,
    dataVencimentoAte: range.ate,
    status: range.status,
    limit: 100,
  });

  const completeDeadline = useCompleteDeadline();
  const reopenDeadline = useReopenDeadline();
  const duplicateDeadline = useDuplicateDeadline();
  const cancelDeadline = useCancelDeadline();

  if (isError) {
    return (
      <div>
        <PageHeader title="Prazos" />
        <ErrorState title="Não foi possível carregar os prazos." onRetry={() => refetch()} />
      </div>
    );
  }

  const activeFilterCount = [!!search, priorityFilter !== 'TODOS'].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setPriorityFilter('TODOS');
  }

  const columns: DataTableColumn<DeadlineListItemDTO>[] = [
    {
      key: 'titulo',
      header: 'Prazo',
      render: (deadline) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{deadline.titulo}</p>
          <p className="truncate text-xs text-muted-foreground">{deadline.tipo}</p>
        </div>
      ),
    },
    {
      key: 'processo',
      header: 'Processo',
      render: (deadline) => (
        <Link href={`/processos/${deadline.processo.id}`} className="text-sm hover:underline">
          {deadline.processo.titulo}
        </Link>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (deadline) =>
        deadline.cliente ? (
          <Link href={`/clientes/${deadline.cliente.id}`} className="text-sm hover:underline">
            {deadline.cliente.nome}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      render: (deadline) =>
        deadline.responsavel ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(deadline.responsavel.nome)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{deadline.responsavel.nome}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'prioridade',
      header: 'Prioridade',
      render: (deadline) => (
        <Badge variant={PRIORITY_VARIANT[deadline.prioridade]}>{PRIORITY_LABEL[deadline.prioridade]}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (deadline) => <StatusBadge status={deadline.status} />,
    },
    {
      key: 'vencimento',
      header: 'Vencimento',
      render: (deadline) => (
        <div>
          <p className="text-sm">{new Date(deadline.dataVencimento).toLocaleDateString('pt-BR')}</p>
          <DaysRemaining dataVencimento={deadline.dataVencimento} status={deadline.status} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (deadline) => {
        if (!canCreate) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Ações para ${deadline.titulo}`}>
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {deadline.status !== 'CONCLUIDO' && (
                <DropdownMenuItem
                  onSelect={() =>
                    completeDeadline.mutate(
                      { processoId: deadline.processo.id, prazoId: deadline.id },
                      {
                        onSuccess: () => toast.success('Prazo concluído.'),
                        onError: () => toast.error('Não foi possível concluir.'),
                      },
                    )
                  }
                >
                  Concluir
                </DropdownMenuItem>
              )}
              {(deadline.status === 'CONCLUIDO' || deadline.status === 'CANCELADO') && (
                <DropdownMenuItem
                  onSelect={() =>
                    reopenDeadline.mutate(
                      { processoId: deadline.processo.id, prazoId: deadline.id },
                      {
                        onSuccess: () => toast.success('Prazo reaberto.'),
                        onError: () => toast.error('Não foi possível reabrir.'),
                      },
                    )
                  }
                >
                  Reabrir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() =>
                  duplicateDeadline.mutate(
                    { processoId: deadline.processo.id, prazoId: deadline.id },
                    {
                      onSuccess: () => toast.success('Prazo duplicado.'),
                      onError: () => toast.error('Não foi possível duplicar.'),
                    },
                  )
                }
              >
                Duplicar
              </DropdownMenuItem>
              {deadline.status !== 'CANCELADO' && deadline.status !== 'CONCLUIDO' && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() =>
                    cancelDeadline.mutate(
                      { processoId: deadline.processo.id, prazoId: deadline.id },
                      {
                        onSuccess: () => toast.success('Prazo cancelado.'),
                        onError: (error) => {
                          const message =
                            (error as { code?: string })?.code === 'JUSTIFICATION_REQUIRED'
                              ? 'Prazos fatais exigem justificativa para cancelar — use o processo para informar o motivo.'
                              : 'Não foi possível cancelar este prazo.';
                          toast.error(message);
                        },
                      },
                    )
                  }
                >
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Prazos"
        description="Todos os prazos, audiências e tarefas do escritório em um só lugar."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <Button
                variant={view === 'lista' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('lista')}
                aria-pressed={view === 'lista'}
              >
                <LayoutList className="size-4" aria-hidden="true" />
                Lista
              </Button>
              <Button
                variant={view === 'calendario' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('calendario')}
                aria-pressed={view === 'calendario'}
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                Calendário
              </Button>
            </div>
            {canCreate && <DeadlineFormDialog />}
          </div>
        }
      />

      <Tabs value={quickFilter} onValueChange={(v) => setQuickFilter(v as QuickFilter)} className="mb-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="amanha">Amanhã</TabsTrigger>
          <TabsTrigger value="semana">Esta semana</TabsTrigger>
          <TabsTrigger value="mes">Este mês</TabsTrigger>
          <TabsTrigger value="vencidos">Vencidos</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'calendario' ? (
        <CalendarView items={data?.items ?? []} isLoading={isLoading} />
      ) : (
        <>
          <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
            <Input
              placeholder="Buscar por título"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar prazos"
              className="sm:max-w-xs"
            />
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as DeadlinePriority | 'TODOS')}>
              <SelectTrigger className="sm:w-40" aria-label="Filtrar por prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as prioridades</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as 'meus' | 'equipe' | 'todos')}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por responsável">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meus">Meus prazos</SelectItem>
                <SelectItem value="equipe">Da minha equipe</SelectItem>
                <SelectItem value="todos">Todos os prazos</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <DataTable
            columns={columns}
            data={data?.items ?? []}
            rowKey={(deadline) => deadline.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={CalendarClock}
                title={hasActiveFilters || quickFilter !== 'todos' ? 'Nenhum prazo encontrado' : 'Nenhum prazo ainda'}
                description="Tente ajustar os filtros ou cadastre um novo prazo a partir de um processo."
              />
            }
          />

          {data?.nextCursor && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Mostrando {data.items.length} prazos — refine a busca para ver outros.
            </p>
          )}
        </>
      )}
    </div>
  );
}
