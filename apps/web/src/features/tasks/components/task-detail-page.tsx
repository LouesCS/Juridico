'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CheckSquare,
  GitBranch,
  History,
  Link2,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Repeat,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { PropertyRow } from '@/components/data-display/property-row';
import { QuickActionsCard } from '@/components/data-display/quick-actions-card';
import { RelatedPanel, type RelatedItem } from '@/components/data-display/related-panel';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { AiSummaryPanel } from '@/features/ai';
import { useMembers } from '@/features/team';
import { usePermission } from '@/hooks/use-permission';
import { useTabDeepLink } from '@/hooks/use-tab-deep-link';
import {
  useAddTaskResponsible,
  useArchiveTask,
  useCancelTask,
  useCompleteTask,
  useDeleteTask,
  useDuplicateTask,
  useRemoveTaskResponsible,
  useReopenTask,
  useRestoreTask,
  useToggleTaskFavorite,
} from '../api/mutations';
import { useTask } from '../api/queries';
import { TaskChecklistTab } from './task-checklist-tab';
import { TaskCommentsTab } from './task-comments-tab';
import { TaskDependenciesTab } from './task-dependencies-tab';
import { TaskFormDialog } from './task-form-dialog';
import { TaskLinksTab } from './task-links-tab';
import { TaskTimelineTab } from './task-timeline-tab';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const VALID_TABS = new Set(['detalhes', 'checklist', 'dependencias', 'vinculos', 'timeline', 'comentarios', 'ia']);

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [tab, setTab] = useTabDeepLink(VALID_TABS, 'detalhes');
  const { data: task, isLoading, isError, refetch } = useTask(taskId);
  const { data: members } = useMembers();

  const canUpdate = usePermission('task:update');
  const canDelete = usePermission('task:delete');
  const canManageTeam = usePermission('task:team:manage');

  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const cancelTask = useCancelTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const duplicateTask = useDuplicateTask();
  const deleteTask = useDeleteTask();
  const toggleFavorite = useToggleTaskFavorite();
  const addResponsible = useAddTaskResponsible();
  const removeResponsible = useRemoveTaskResponsible();

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [novoAuxiliarId, setNovoAuxiliarId] = React.useState('');

  if (isError) {
    return (
      <div>
        <PageHeader title="Tarefa" breadcrumbs={[{ label: 'Tarefas', href: '/tarefas/minhas' }]} />
        <ErrorState
          title="Não foi possível carregar esta tarefa."
          description="A tarefa pode não existir, ter sido excluída, ou estar fora do seu escopo de permissão."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading || !task) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const isConcluida = !!task.concluidaEm;
  const isCancelada = !!task.canceladaEm;
  const isArquivada = !!task.arquivadaEm;
  const auxiliaresIds = new Set(task.responsaveisAuxiliares.map((m) => m.id));
  const candidatosAuxiliares = (members ?? []).filter(
    (m) => m.status === 'ATIVO' && m.id !== task.responsavel?.id && !auxiliaresIds.has(m.id),
  );

  function handleDelete() {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success('Tarefa excluída.');
        router.push('/tarefas/minhas');
      },
      onError: () => {
        toast.error('Não foi possível excluir esta tarefa.');
        setDeleteOpen(false);
      },
    });
  }

  const relatedItems: RelatedItem[] = [
    { label: 'Checklist', icon: ListChecks, href: `/tarefas/${task.id}?tab=checklist`, count: task.checklist.length },
    { label: 'Dependências', icon: GitBranch, href: `/tarefas/${task.id}?tab=dependencias`, count: task.dependencias.length },
    { label: 'Vínculos', icon: Link2, href: `/tarefas/${task.id}?tab=vinculos`, count: task.vinculos.length },
    { label: 'Timeline', icon: History, href: `/tarefas/${task.id}?tab=timeline` },
    { label: 'Comentários', icon: MessageSquare, href: `/tarefas/${task.id}?tab=comentarios` },
    { label: 'IA', icon: Sparkles, href: `/tarefas/${task.id}?tab=ia` },
  ];

  return (
    <div>
      <PageHeader
        title={task.titulo}
        breadcrumbs={[{ label: 'Tarefas', href: '/tarefas/minhas' }, { label: task.titulo }]}
        actions={
          <div className="flex items-center gap-2">
            <FavoriteButton
              favorito={task.favorita}
              isPending={toggleFavorite.isPending}
              label={task.favorita ? 'Remover dos favoritos' : 'Favoritar'}
              onToggle={() => toggleFavorite.mutate(taskId)}
            />
            {task.status && <Badge variant="secondary">{task.status.valor}</Badge>}
            {task.prioridade && <Badge variant="outline">{task.prioridade.valor}</Badge>}
            {isConcluida && <Badge variant="success">Concluída</Badge>}
            {isCancelada && <Badge variant="destructive">Cancelada</Badge>}
            {isArquivada && <Badge variant="outline">Arquivada</Badge>}
            {canUpdate && <TaskFormDialog mode="edit" task={task} trigger={<Button variant="outline">Editar</Button>} />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdate && !isConcluida && !isCancelada && (
                  <DropdownMenuItem
                    onSelect={() =>
                      completeTask.mutate(taskId, {
                        onSuccess: (result) =>
                          toast.success(
                            result.proximaOcorrenciaId
                              ? 'Tarefa concluída — próxima ocorrência recorrente criada.'
                              : 'Tarefa concluída.',
                          ),
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
                {canUpdate && (isConcluida || isCancelada) && (
                  <DropdownMenuItem
                    onSelect={() =>
                      reopenTask.mutate(taskId, {
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
                    duplicateTask.mutate(taskId, {
                      onSuccess: (result) => {
                        toast.success('Tarefa duplicada.');
                        router.push(`/tarefas/${result.id}`);
                      },
                      onError: () => toast.error('Não foi possível duplicar.'),
                    })
                  }
                >
                  Duplicar
                </DropdownMenuItem>
                {canUpdate && !isArquivada && (
                  <DropdownMenuItem
                    onSelect={() =>
                      archiveTask.mutate(taskId, {
                        onSuccess: () => toast.success('Tarefa arquivada.'),
                        onError: () => toast.error('Não foi possível arquivar.'),
                      })
                    }
                  >
                    Arquivar
                  </DropdownMenuItem>
                )}
                {canDelete && isArquivada && (
                  <DropdownMenuItem
                    onSelect={() =>
                      restoreTask.mutate(taskId, {
                        onSuccess: () => toast.success('Tarefa restaurada.'),
                        onError: () => toast.error('Não foi possível restaurar.'),
                      })
                    }
                  >
                    Restaurar
                  </DropdownMenuItem>
                )}
                {canUpdate && !isCancelada && !isConcluida && (
                  <DropdownMenuItem onSelect={() => setCancelOpen(true)}>Cancelar</DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}>
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="dependencias">Dependências</TabsTrigger>
            <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {task.descricao && <p className="mb-4 whitespace-pre-wrap text-sm">{task.descricao}</p>}
                <PropertyRow label="Categoria" value={task.categoria?.nome} />
                <PropertyRow label="Responsável" value={task.responsavel?.nome} />
                <PropertyRow
                  label="Data de início"
                  value={task.dataInicio ? new Date(task.dataInicio).toLocaleDateString('pt-BR') : undefined}
                />
                <PropertyRow
                  label="Data de vencimento"
                  value={task.dataVencimento ? new Date(task.dataVencimento).toLocaleDateString('pt-BR') : undefined}
                />
                <PropertyRow label="Criada em" value={new Date(task.criadoEm).toLocaleDateString('pt-BR')} />
                {task.motivoCancelamento && <PropertyRow label="Motivo do cancelamento" value={task.motivoCancelamento} />}
                {task.recorrenciaId && (
                  <PropertyRow
                    label="Recorrência"
                    value={
                      <span className="flex items-center justify-end gap-1">
                        <Repeat className="size-3.5" aria-hidden="true" />
                        Tarefa recorrente
                      </span>
                    }
                  />
                )}
                {task.tarefaOrigemId && (
                  <PropertyRow
                    label="Origem"
                    value={
                      <Link href={`/tarefas/${task.tarefaOrigemId}`} className="hover:underline">
                        Ver tarefa de origem
                      </Link>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Responsáveis auxiliares</CardTitle>
                {canManageTeam && candidatosAuxiliares.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={novoAuxiliarId} onValueChange={setNovoAuxiliarId}>
                      <SelectTrigger className="w-48" aria-label="Adicionar responsável auxiliar">
                        <SelectValue placeholder="Selecionar membro" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidatosAuxiliares.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.usuario.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!novoAuxiliarId || addResponsible.isPending}
                      onClick={() =>
                        addResponsible.mutate(
                          { tarefaId: taskId, membroId: novoAuxiliarId },
                          {
                            onSuccess: () => {
                              toast.success('Responsável adicionado.');
                              setNovoAuxiliarId('');
                            },
                            onError: () => toast.error('Não foi possível adicionar.'),
                          },
                        )
                      }
                    >
                      <UserPlus className="size-4" aria-hidden="true" />
                      Adicionar
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {task.responsaveisAuxiliares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum responsável auxiliar nesta tarefa.</p>
                ) : (
                  <ul className="space-y-2">
                    {task.responsaveisAuxiliares.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-xs">{initials(member.nome)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.nome}</span>
                        </div>
                        {canManageTeam && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${member.nome}`}
                            onClick={() =>
                              removeResponsible.mutate(
                                { tarefaId: taskId, membroId: member.id },
                                { onError: () => toast.error('Não foi possível remover.') },
                              )
                            }
                          >
                            <X className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <TaskChecklistTab taskId={taskId} checklist={task.checklist} />
          </TabsContent>

          <TabsContent value="dependencias">
            <TaskDependenciesTab taskId={taskId} dependencias={task.dependencias} bloqueando={task.bloqueando} />
          </TabsContent>

          <TabsContent value="vinculos">
            <TaskLinksTab taskId={taskId} vinculos={task.vinculos} />
          </TabsContent>

          <TabsContent value="timeline">
            <TaskTimelineTab taskId={taskId} />
          </TabsContent>

          <TabsContent value="comentarios">
            <TaskCommentsTab taskId={taskId} />
          </TabsContent>

          <TabsContent value="ia" className="space-y-4">
            <AiSummaryPanel escopoTipo="TAREFA" escopoId={taskId} />
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Painel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <PropertyRow label="Status" value={task.status ? <Badge variant="secondary">{task.status.valor}</Badge> : undefined} />
              <PropertyRow label="Prioridade" value={task.prioridade ? <Badge variant="outline">{task.prioridade.valor}</Badge> : undefined} />
              <PropertyRow label="Categoria" value={task.categoria?.nome} />
              <PropertyRow
                label="Vencimento"
                value={task.dataVencimento ? new Date(task.dataVencimento).toLocaleDateString('pt-BR') : 'Sem prazo'}
              />
            </CardContent>
          </Card>

          {canUpdate && (
            <QuickActionsCard>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  duplicateTask.mutate(taskId, {
                    onSuccess: (result) => {
                      toast.success('Tarefa duplicada.');
                      router.push(`/tarefas/${result.id}`);
                    },
                    onError: () => toast.error('Não foi possível duplicar.'),
                  })
                }
              >
                <CheckSquare className="size-4" aria-hidden="true" />
                Duplicar tarefa
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/tarefas/calendario`}>
                  <CalendarClock className="size-4" aria-hidden="true" />
                  Ver no calendário
                </Link>
              </Button>
            </QuickActionsCard>
          )}

          <RelatedPanel items={relatedItems} />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir tarefa"
        description={`"${task.titulo}" será excluída. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteTask.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar tarefa"
        description={`"${task.titulo}" será marcada como cancelada.`}
        confirmLabel="Cancelar tarefa"
        loading={cancelTask.isPending}
        onConfirm={() =>
          cancelTask.mutate(
            { tarefaId: taskId },
            {
              onSuccess: () => {
                toast.success('Tarefa cancelada.');
                setCancelOpen(false);
              },
              onError: () => toast.error('Não foi possível cancelar.'),
            },
          )
        }
      />
    </div>
  );
}
