'use client';

import type React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, FileText, History, MoreHorizontal, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { AiSummaryPanel } from '@/features/ai';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { TaskFormDialog } from '@/features/tasks/components/task-form-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
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
import { usePermission } from '@/hooks/use-permission';
import { judicialMovementsApi } from '../api/judicial-movements.api';

const linkClass =
  'rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const fmt = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{children}</dd>
    </div>
  );
}

export function JudicialMovementDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const canUpdate = usePermission('movement:update');
  const canCreateTask = usePermission('task:create');
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
  const query = useQuery({
    queryKey: ['judicial-movement-detail', id],
    queryFn: () => judicialMovementsApi.get(id),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['judicial-movement-detail', id] });
    void qc.invalidateQueries({ queryKey: ['judicial-movements'] });
  };
  const read = useMutation({
    mutationFn: () => judicialMovementsApi.toggleRead(id),
    onSuccess: invalidate,
  });
  const timeline = useMutation({
    mutationFn: () => judicialMovementsApi.publishToTimeline(id),
    onSuccess: (r) => {
      toast.success(
        r.duplicada ? 'Movimentação já estava na timeline.' : 'Movimentação lançada na timeline.',
      );
      invalidate();
    },
  });
  if (query.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <ErrorState title="Movimentação judicial não encontrada." onRetry={() => query.refetch()} />
    );
  const movement = query.data;
  return (
    <div>
      <PageHeader
        title="Movimentação judicial"
        breadcrumbs={[
          { label: 'Jurídico' },
          { label: 'Movimentações judiciais', href: '/movimentacoes-judiciais' },
          { label: 'Movimentação judicial' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft />
              Voltar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal />
                  Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canCreateTask && movement.processo ? (
                  <TaskFormDialog
                    mode="create"
                    fixedVinculos={[
                      { tipoRecurso: 'MOVIMENTACAO_JUDICIAL', recursoId: movement.id, label: 'Movimentação judicial' },
                      { tipoRecurso: 'PROCESSO', recursoId: movement.processo.id, label: `Processo ${movement.processo.numeroCnj ?? movement.processo.titulo}` },
                      ...(movement.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: movement.pastaJuridica.id, label: `Pasta ${movement.pastaJuridica.nome}` }] : []),
                    ]}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Lançar tarefa
                      </DropdownMenuItem>
                    }
                  />
                ) : canCreateTask ? (
                  <DropdownMenuItem
                    disabled
                    title="A movimentação precisa estar vinculada a um Processo."
                  >
                    Lançar tarefa
                  </DropdownMenuItem>
                ) : null}
                {canUpdate && movement.pastaJuridica && (
                  <DropdownMenuItem
                    disabled={movement.naTimeline}
                    onSelect={() => timeline.mutate()}
                  >
                    <History />
                    {movement.naTimeline
                      ? 'Lançada na timeline da pasta'
                      : 'Lançar na timeline da pasta'}
                  </DropdownMenuItem>
                )}
                {canUpdate && (
                  <DropdownMenuItem onSelect={() => read.mutate()}>
                    <CheckCheck />
                    {movement.lida ? 'Marcar como não lida' : 'Marcar como lida'}
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
            <dl className="grid gap-5 sm:grid-cols-2">
              <Field label="Data da movimentação">{fmt(movement.dataMovimento)}</Field>
              <Field label="Data de cadastro">{fmt(movement.capturadoEm)}</Field>
              <Field label="Leitura">{movement.lida ? 'Lida' : 'Não lida'}</Field>
              <Field label="Origem">Capturada ({movement.provider})</Field>
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
          <p className="break-words whitespace-pre-wrap select-text">{movement.descricao}</p>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Tarefas ({movement.tarefas?.length ?? 0})</CardTitle>
          {canCreateTask && movement.processo && (
            <TaskFormDialog
              mode="create"
              fixedVinculos={[
                { tipoRecurso: 'MOVIMENTACAO_JUDICIAL', recursoId: movement.id, label: 'Movimentação judicial' },
                { tipoRecurso: 'PROCESSO', recursoId: movement.processo.id, label: `Processo ${movement.processo.numeroCnj ?? movement.processo.titulo}` },
                ...(movement.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: movement.pastaJuridica.id, label: `Pasta ${movement.pastaJuridica.nome}` }] : []),
              ]}
              trigger={<Button size="sm">Criar tarefa</Button>}
            />
          )}
        </CardHeader>
        <CardContent>
          {movement.tarefas?.length ? (
            <div className="divide-y rounded-lg border">
              {movement.tarefas.map((task) => (
                <div className="p-3" key={task.id}>
                  {canTask ? (
                    <Link className={linkClass} href={`/tarefas/${task.id}`}>
                      {task.titulo}
                    </Link>
                  ) : (
                    task.titulo
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
      <AuditContextSection resourceType="MOVIMENTACAO_JUDICIAL" resourceId={movement.id} />
    </div>
  );
}
