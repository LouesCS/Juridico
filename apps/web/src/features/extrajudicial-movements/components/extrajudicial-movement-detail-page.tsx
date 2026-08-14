'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Scale,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { usePermission } from '@/hooks/use-permission';
import { TaskFormDialog } from '@/features/tasks/components/task-form-dialog';
import { AiSummaryPanel } from '@/features/ai';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { extraMovementsApi, type ExtraMovement } from '../api/extrajudicial-movements.api';
import {
  ExtrajudicialMovementEditDialog,
  type ExtraMovementEdit,
} from './extrajudicial-movement-edit-dialog';

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));
const linkClass =
  'rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{children}</dd>
    </div>
  );
}

export function ExtrajudicialMovementDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const canUpdate = usePermission('extrajudicial-movement:update');
  const canFolder = [
    usePermission('legal-folder:read:all'),
    usePermission('legal-folder:read:team'),
    usePermission('legal-folder:read:assigned'),
  ].some(Boolean);
  const canCase = [
    usePermission('case:read:all'),
    usePermission('case:read:team'),
    usePermission('case:read:assigned'),
  ].some(Boolean);
  const canTask = [
    usePermission('task:read:all'),
    usePermission('task:read:team'),
    usePermission('task:read:assigned'),
  ].some(Boolean);
  const canCreateTask = usePermission('task:create');
  const canRemove = usePermission('extrajudicial-movement:delete');
  const [editing, setEditing] = React.useState<ExtraMovement | undefined>();
  const [expanded, setExpanded] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const query = useQuery({
    queryKey: ['extrajudicial-movement-detail', id],
    queryFn: () => extraMovementsApi.get(id),
  });
  const toggleRead = useMutation({
    mutationFn: () => extraMovementsApi.toggleRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['extrajudicial-movement-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['extra-movements'] });
    },
  });
  const update = useMutation({
    mutationFn: (body: ExtraMovementEdit) => extraMovementsApi.update(id, body),
    onSuccess: () => {
      setEditing(undefined);
      toast.success('Movimentação atualizada.');
      void queryClient.invalidateQueries({ queryKey: ['extrajudicial-movement-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['extra-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['legal-folder'] });
    },
  });
  const publishTimeline = useMutation({
    mutationFn: () => extraMovementsApi.publishToTimeline(id),
    onSuccess: () => {
      toast.success('Movimentação lançada na timeline da Pasta.');
      void queryClient.invalidateQueries({ queryKey: ['extrajudicial-movement-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['extra-movements'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => extraMovementsApi.remove(id),
    onSuccess: () => {
      toast.success('Movimentação removida.');
      void queryClient.invalidateQueries({ queryKey: ['extra-movements'] });
      window.history.back();
    },
  });
  if (query.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Movimentação extrajudicial não encontrada."
        onRetry={() => query.refetch()}
      />
    );
  const movement = query.data;
  const isLong = movement.descricao.length > 700 || movement.descricao.split('\n').length > 12;
  return (
    <div>
      <PageHeader
        title="Movimentação extrajudicial"
        breadcrumbs={[
          { label: 'Jurídico' },
          { label: 'Movimentações extrajudiciais', href: '/movimentacoes-extrajudiciais' },
          { label: 'Movimentação extrajudicial' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft />
              Voltar
            </Button>
            {canUpdate && (
              <Button variant="outline" onClick={() => setEditing(movement)}>
                <Pencil />
                Editar
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal />
                  Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canCreateTask && (
                  <TaskFormDialog
                    mode="create"
                    fixedVinculos={[
                      { tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL', recursoId: movement.id, label: 'Movimentação extrajudicial' },
                      ...(movement.processo ? [{ tipoRecurso: 'PROCESSO' as const, recursoId: movement.processo.id, label: `Processo ${movement.processo.numeroCnj ?? movement.processo.titulo}` }] : []),
                      ...(movement.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: movement.pastaJuridica.id, label: `Pasta ${movement.pastaJuridica.nome}` }] : []),
                    ]}
                    trigger={
                      <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                        Lançar tarefa
                      </DropdownMenuItem>
                    }
                  />
                )}
                {canUpdate && movement.pastaJuridica && (
                  <DropdownMenuItem
                    disabled={publishTimeline.isPending || movement.naTimeline}
                    onSelect={() => publishTimeline.mutate()}
                  >
                    <History />
                    {movement.naTimeline
                      ? 'Lançada na timeline da pasta'
                      : 'Lançar na timeline da pasta'}
                  </DropdownMenuItem>
                )}
                {canUpdate && (
                  <DropdownMenuItem
                    disabled={toggleRead.isPending}
                    onSelect={() => toggleRead.mutate()}
                  >
                    <CheckCheck />
                    {movement.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                  </DropdownMenuItem>
                )}
                {canRemove && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setConfirmRemove(true)}
                  >
                    <Trash2 />
                    Remover
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Field label="Data da movimentação">{formatDate(movement.dataMovimentacao)}</Field>
              <Field label="Data de cadastro">{formatDate(movement.criadoEm)}</Field>
              <Field label="Leitura">{movement.lida ? 'Lida' : 'Não lida'}</Field>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vínculos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-5">
              <Field label="Pasta">
                {movement.pastaJuridica ? (
                  canFolder ? (
                    <Link className={linkClass} href={`/pastas/${movement.pastaJuridica.id}`}>
                      {movement.pastaJuridica.nome}
                    </Link>
                  ) : (
                    movement.pastaJuridica.nome
                  )
                ) : (
                  '--'
                )}
              </Field>
              <Field label="Processo">
                {movement.processo ? (
                  canCase ? (
                    <Link className={linkClass} href={`/processos/${movement.processo.id}`}>
                      {movement.processo.numeroCnj ?? movement.processo.titulo}
                    </Link>
                  ) : (
                    (movement.processo.numeroCnj ?? movement.processo.titulo)
                  )
                ) : (
                  '--'
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`break-words whitespace-pre-wrap ${isLong && !expanded ? 'max-h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]' : ''}`}
          >
            {movement.descricao}
          </div>
          {isLong && (
            <Button className="mt-3" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Ver menos' : 'Ver mais'}
            </Button>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Tarefas ({movement.tarefas.length})</CardTitle>
          {canCreateTask && (
            <TaskFormDialog
              mode="create"
              fixedVinculos={[
                { tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL', recursoId: movement.id, label: 'Movimentação extrajudicial' },
                ...(movement.processo ? [{ tipoRecurso: 'PROCESSO' as const, recursoId: movement.processo.id, label: `Processo ${movement.processo.numeroCnj ?? movement.processo.titulo}` }] : []),
                ...(movement.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: movement.pastaJuridica.id, label: `Pasta ${movement.pastaJuridica.nome}` }] : []),
              ]}
              trigger={
                <Button size="icon" aria-label="Criar tarefa">
                  +
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent>
          {movement.tarefas.length ? (
            <div className="divide-y rounded-lg border">
              {movement.tarefas.map((task) => (
                <div className="p-3" key={task.id}>
                  {canTask ? (
                    <Link className={linkClass} href={`/tarefas/${task.id}`}>
                      {task.titulo}
                    </Link>
                  ) : (
                    <span>{task.titulo}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="Nenhuma tarefa vinculada." />
          )}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Prompts de IA</CardTitle>
        </CardHeader>
        <CardContent>
          {movement.processo ? (
            <AiSummaryPanel escopoTipo="PROCESSO" escopoId={movement.processo.id} />
          ) : (
            <EmptyState
              icon={Scale}
              title="Vincule um Processo para utilizar a IA."
              description="O AI Engine atual trabalha com o contexto real do Processo."
            />
          )}
        </CardContent>
      </Card>
      <AuditContextSection resourceType="MOVIMENTACAO_EXTRAJUDICIAL" resourceId={movement.id} />
      <ExtrajudicialMovementEditDialog
        movement={editing}
        onClose={() => setEditing(undefined)}
        loading={update.isPending}
        onSave={(body) => update.mutate(body)}
      />
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remover movimentação extrajudicial?"
        description="A movimentação será removida das consultas do escritório. Os vínculos relacionados serão preservados conforme as regras do sistema."
        confirmLabel="Remover"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
