'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckSquare, MoreHorizontal } from 'lucide-react';
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
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FilterBar } from '@/components/data-display/filter-bar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useTaskCategories } from '@/features/configuration/api/queries';
import { useMembers } from '@/features/team';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import {
  useArchiveTask,
  useCancelTask,
  useCompleteTask,
  useDuplicateTask,
  useReopenTask,
  useToggleTaskFavorite,
} from '../api/mutations';
import { useTaskConfig, useTasks } from '../api/queries';
import type { TaskListItemDTO } from '../api/tasks.api';
import { CreateTaskFromTemplateDialog } from './create-task-from-template-dialog';
import { TaskFormDialog } from './task-form-dialog';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type Situacao = 'TODAS' | 'PENDENTES' | 'CONCLUIDAS' | 'ATRASADAS';

/**
 * Página compartilhada por "Minhas Tarefas" (`escopo=meus`) e "Equipe"
 * (`escopo=equipe`) — mesma tabela e filtros, só muda o escopo de leitura
 * resolvido no backend (`resolveTaskReadScope`/`buildTaskScopeWhere`).
 * `clienteId`/`processoId` na URL (`?clienteId=`/`?processoId=`) permitem o
 * deep-link vindo do painel "Relacionados"/Ações rápidas de Cliente e
 * Processo, sem precisar de um seletor manual nesta tela.
 */
export function TaskListPage({ scope, title }: { scope: 'meus' | 'equipe'; title: string }) {
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('clienteId') ?? undefined;
  const processoId = searchParams.get('processoId') ?? undefined;

  const canCreate = usePermission('task:create');
  const [search, setSearch] = React.useState('');
  const [statusId, setStatusId] = React.useState('TODOS');
  const [categoriaId, setCategoriaId] = React.useState('TODOS');
  const [prioridadeId, setPrioridadeId] = React.useState('TODOS');
  const [responsavelId, setResponsavelId] = React.useState('TODOS');
  const [situacao, setSituacao] = React.useState<Situacao>('PENDENTES');
  const [favoritasApenas, setFavoritasApenas] = React.useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { data: config } = useTaskConfig();
  const { data: categorias } = useTaskCategories();
  const { data: members } = useMembers();

  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const duplicateTask = useDuplicateTask();
  const archiveTask = useArchiveTask();
  const cancelTask = useCancelTask();
  const toggleFavorite = useToggleTaskFavorite();

  const { data, isLoading, isError, refetch } = useTasks({
    escopo: scope,
    q: debouncedSearch || undefined,
    statusId: statusId === 'TODOS' ? undefined : statusId,
    categoriaId: categoriaId === 'TODOS' ? undefined : categoriaId,
    prioridadeId: prioridadeId === 'TODOS' ? undefined : prioridadeId,
    responsavelId: responsavelId === 'TODOS' ? undefined : responsavelId,
    clienteId,
    processoId,
    pendentes: situacao === 'PENDENTES' ? true : undefined,
    concluidas: situacao === 'CONCLUIDAS' ? true : undefined,
    atrasadas: situacao === 'ATRASADAS' ? true : undefined,
    favoritas: favoritasApenas || undefined,
    sort: 'dataVencimento',
    limit: 50,
  });

  if (isError) {
    return (
      <div>
        <PageHeader title={title} />
        <ErrorState title="Não foi possível carregar as tarefas." onRetry={() => refetch()} />
      </div>
    );
  }

  const hasActiveFilters =
    !!search ||
    statusId !== 'TODOS' ||
    categoriaId !== 'TODOS' ||
    prioridadeId !== 'TODOS' ||
    responsavelId !== 'TODOS' ||
    situacao !== 'PENDENTES' ||
    favoritasApenas;

  function clearFilters() {
    setSearch('');
    setStatusId('TODOS');
    setCategoriaId('TODOS');
    setPrioridadeId('TODOS');
    setResponsavelId('TODOS');
    setSituacao('PENDENTES');
    setFavoritasApenas(false);
  }

  const columns: DataTableColumn<TaskListItemDTO>[] = [
    {
      key: 'titulo',
      header: 'Tarefa',
      render: (task) => (
        <div className="flex items-center gap-1">
          <FavoriteButton
            favorito={task.favorita}
            isPending={toggleFavorite.isPending}
            label={task.favorita ? `Remover ${task.titulo} dos favoritos` : `Favoritar ${task.titulo}`}
            onToggle={() => toggleFavorite.mutate(task.id)}
          />
          <Link href={`/tarefas/${task.id}`} className="min-w-0 hover:underline">
            <p className="truncate text-sm font-medium">{task.titulo}</p>
          </Link>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (task) =>
        task.categoria ? (
          <Badge variant="outline" style={{ borderColor: task.categoria.cor }}>
            {task.categoria.nome}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (task) => (task.status ? <Badge variant="secondary">{task.status.valor}</Badge> : '—'),
    },
    {
      key: 'prioridade',
      header: 'Prioridade',
      render: (task) => (task.prioridade ? <Badge variant="outline">{task.prioridade.valor}</Badge> : '—'),
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      render: (task) =>
        task.responsavel ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(task.responsavel.nome)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{task.responsavel.nome}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: 'dataVencimento',
      header: 'Vencimento',
      render: (task) =>
        task.dataVencimento ? (
          <span className={task.atrasada ? 'font-medium text-destructive' : 'text-sm'}>
            {new Date(task.dataVencimento).toLocaleDateString('pt-BR')}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sem prazo</span>
        ),
    },
    {
      key: 'acoes',
      header: '',
      className: 'text-right',
      render: (task) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Ações para ${task.titulo}`}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/tarefas/${task.id}`}>Abrir</Link>
            </DropdownMenuItem>
            {!task.concluidaEm && !task.canceladaEm && (
              <DropdownMenuItem
                onSelect={() =>
                  completeTask.mutate(task.id, {
                    onSuccess: () => toast.success('Tarefa concluída.'),
                    onError: (error) => {
                      const code = (error as { code?: string })?.code;
                      toast.error(
                        code === 'TASK_DEPENDENCIES_PENDING'
                          ? 'Existem dependências pendentes bloqueando esta tarefa.'
                          : code === 'TASK_CHECKLIST_PENDING'
                            ? 'Existem itens obrigatórios do checklist pendentes.'
                            : 'Não foi possível concluir a tarefa.',
                      );
                    },
                  })
                }
              >
                Concluir
              </DropdownMenuItem>
            )}
            {(task.concluidaEm || task.canceladaEm) && (
              <DropdownMenuItem
                onSelect={() =>
                  reopenTask.mutate(task.id, {
                    onSuccess: () => toast.success('Tarefa reaberta.'),
                    onError: () => toast.error('Não foi possível reabrir.'),
                  })
                }
              >
                Reabrir
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() =>
                duplicateTask.mutate(task.id, {
                  onSuccess: () => toast.success('Tarefa duplicada.'),
                  onError: () => toast.error('Não foi possível duplicar.'),
                })
              }
            >
              Duplicar
            </DropdownMenuItem>
            {!task.arquivadaEm && (
              <DropdownMenuItem
                onSelect={() =>
                  archiveTask.mutate(task.id, {
                    onSuccess: () => toast.success('Tarefa arquivada.'),
                    onError: () => toast.error('Não foi possível arquivar.'),
                  })
                }
              >
                Arquivar
              </DropdownMenuItem>
            )}
            {!task.canceladaEm && !task.concluidaEm && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  cancelTask.mutate(
                    { tarefaId: task.id },
                    {
                      onSuccess: () => toast.success('Tarefa cancelada.'),
                      onError: () => toast.error('Não foi possível cancelar.'),
                    },
                  )
                }
              >
                Cancelar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={title}
        description="Tarefas, prazos internos e checklists da equipe."
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <CreateTaskFromTemplateDialog />
              <TaskFormDialog mode="create" />
            </div>
          ) : undefined
        }
      />

      <FilterBar activeCount={Number(hasActiveFilters)} onClear={clearFilters}>
        <Input
          placeholder="Buscar tarefas"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar tarefas"
          className="sm:max-w-xs"
        />
        <Select value={situacao} onValueChange={(v) => setSituacao(v as Situacao)}>
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas</SelectItem>
            <SelectItem value="PENDENTES">Pendentes</SelectItem>
            <SelectItem value="CONCLUIDAS">Concluídas</SelectItem>
            <SelectItem value="ATRASADAS">Atrasadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusId} onValueChange={setStatusId}>
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            {(config?.status ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.valor}
              </SelectItem>
            ))}
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
        <Select value={responsavelId} onValueChange={setResponsavelId}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por responsável">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os responsáveis</SelectItem>
            {(members ?? [])
              .filter((m) => m.status === 'ATIVO')
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.usuario.nome}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={favoritasApenas ? 'secondary' : 'outline'}
          size="sm"
          aria-pressed={favoritasApenas}
          onClick={() => setFavoritasApenas((prev) => !prev)}
        >
          Favoritas
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(task) => task.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={CheckSquare}
            title={hasActiveFilters ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa ainda'}
            description={
              hasActiveFilters ? 'Tente ajustar a busca ou os filtros.' : 'Crie a primeira tarefa do escritório.'
            }
          />
        }
      />

      {data?.nextCursor && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Mostrando {data.items.length} tarefas — refine a busca para ver outras.
        </p>
      )}
    </div>
  );
}
