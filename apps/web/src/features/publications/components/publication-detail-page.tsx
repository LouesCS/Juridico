'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { TaskFormDialog } from '@/features/tasks/components/task-form-dialog';
import { CreateTaskFromTemplateDialog } from '@/features/tasks/components/create-task-from-template-dialog';
import { tasksApi } from '@/features/tasks/api/tasks.api';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { publicationsApi } from '../api/publications.api';

const value = (value: string | null | undefined) => value || '--';
const date = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '--');

export function PublicationDetailPage({ id }: { id: string }) {
  const client = useQueryClient();
  const publication = useQuery({
    queryKey: ['publication', id],
    queryFn: () => publicationsApi.get(id),
  });
  const tasks = useQuery({
    queryKey: ['tasks', 'publication', id],
    queryFn: () => tasksApi.list({ publicacaoId: id, sort: 'dataVencimento', limit: 50 }),
  });
  const visibility = useMutation({
    mutationFn: () => publicationsApi.toggleHidden(id),
    onSuccess: () => {
      toast.success('Visualização atualizada.');
      void client.invalidateQueries({ queryKey: ['publication', id] });
    },
  });
  if (publication.isLoading) return <Skeleton className="h-96" />;
  const p = publication.data;
  if (!p) return <EmptyState icon={Printer} title="Publicação não encontrada." />;
  return (
    <article className="publication-print min-w-0">
      <PageHeader
        title="Publicação"
        breadcrumbs={[{ label: 'Publicações', href: '/publicacoes' }, { label: 'Detalhe' }]}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => visibility.mutate()}>
                {p.oculta ? 'Desocultar' : 'Ocultar'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/publicacoes?publicacao=${p.id}`}>Vincular</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Data da publicação" text={date(p.dataPublicacao)} />
            <Field label="Data de cadastro" text={date(p.capturadoEm)} />
            <Field label="Número CNJ / Processo na publicação" text={p.numeroCnj} />
            <Field label="Nome de vínculo" text={value(p.nomeVinculo)} />
            <Field label="Órgão" text={value(p.orgao ?? p.tribunal)} />
            <Field label="Diário" text={value(p.diario)} />
            <Field label="Cidade" text={value(p.cidade)} />
            <Field label="Vara" text={value(p.vara)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vínculos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Pasta">
              {p.pastaJuridica ? (
                <Link
                  className="text-primary hover:underline"
                  href={`/pastas/${p.pastaJuridica.id}`}
                >
                  {p.pastaJuridica.nome}
                </Link>
              ) : (
                '--'
              )}
            </Field>
            <Field label="Processo">
              {p.processo ? (
                <Link className="text-primary hover:underline" href={`/processos/${p.processo.id}`}>
                  {p.processo.titulo}
                </Link>
              ) : (
                '--'
              )}
            </Field>
            <Field label="Visualização" text={p.oculta ? 'Oculta' : 'Não ocultada'} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <Expandable text={p.conteudo ?? '--'} />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Tarefas ({p.tarefasTotal})</CardTitle>
          <div className="flex gap-2">
            <TaskFormDialog
              mode="create"
              fixedVinculos={[
                { tipoRecurso: 'PUBLICACAO', recursoId: p.id, label: 'Publicação' },
                ...(p.pastaJuridica
                  ? [
                      {
                        tipoRecurso: 'PASTA_JURIDICA' as const,
                        recursoId: p.pastaJuridica.id,
                        label: 'Pasta',
                      },
                    ]
                  : []),
                ...(p.processo
                  ? [
                      {
                        tipoRecurso: 'PROCESSO' as const,
                        recursoId: p.processo.id,
                        label: 'Processo',
                      },
                    ]
                  : []),
              ]}
            />
            <CreateTaskFromTemplateDialog
              fixedVinculos={[{ tipoRecurso: 'PUBLICACAO', recursoId: p.id }]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <Skeleton className="h-24" />
          ) : !tasks.data?.items.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {tasks.data.items.map((task) => (
                <Link
                  key={task.id}
                  href={`/tarefas/${task.id}`}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <span>{task.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.dataVencimento
                      ? new Date(task.dataVencimento).toLocaleDateString('pt-BR')
                      : '--'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AuditContextSection resourceType="PUBLICACAO" resourceId={id} splitByPeriod />
      <style jsx global>{`
        @media print {
          aside,
          nav,
          header,
          button,
          [role='menu'] {
            display: none !important;
          }
          .publication-print {
            padding: 0 !important;
          }
        }
      `}</style>
    </article>
  );
}
function Field({
  label,
  text,
  children,
}: {
  label: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children ?? text ?? '--'}</div>
    </div>
  );
}
function Expandable({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const long = text.length > 600;
  return (
    <div>
      <p
        className={`text-sm leading-6 whitespace-pre-wrap ${long && !expanded ? 'max-h-40 overflow-hidden' : ''}`}
      >
        {text}
      </p>
      {long && (
        <Button variant="link" className="px-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </Button>
      )}
    </div>
  );
}
