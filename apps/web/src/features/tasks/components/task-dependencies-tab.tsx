'use client';

import * as React from 'react';
import Link from 'next/link';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermission } from '@/hooks/use-permission';
import { useAddDependency, useRemoveDependency } from '../api/mutations';
import { useTasks } from '../api/queries';
import type { TaskDependencyRefDTO } from '../api/tasks.api';

function DependencyRow({
  dependency,
  onRemove,
  removing,
}: {
  dependency: TaskDependencyRefDTO;
  onRemove?: () => void;
  removing?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <Link href={`/tarefas/${dependency.id}`} className="min-w-0 truncate text-sm hover:underline">
        {dependency.titulo}
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={dependency.concluidaEm ? 'success' : 'outline'}>
          {dependency.concluidaEm ? 'Concluída' : 'Pendente'}
        </Badge>
        {onRemove && (
          <Button variant="ghost" size="icon" aria-label="Remover dependência" onClick={onRemove} disabled={removing}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * "Teto de bloqueio" (Prompt 14 §Dependências) — enquanto houver item em
 * `dependencias` sem `concluidaEm`, `POST /tasks/:id/complete` responde
 * `TASK_DEPENDENCIES_PENDING`; `bloqueando` é só informativo (tarefas que
 * dependem desta, sem ação possível aqui).
 */
export function TaskDependenciesTab({
  taskId,
  dependencias,
  bloqueando,
}: {
  taskId: string;
  dependencias: TaskDependencyRefDTO[];
  bloqueando: TaskDependencyRefDTO[];
}) {
  const canUpdate = usePermission('task:update');
  const [selecionado, setSelecionado] = React.useState('');
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();
  const { data } = useTasks({ limit: 100, sort: '-criadoEm' });

  const jaVinculadas = new Set([taskId, ...dependencias.map((d) => d.id)]);
  const candidatos = (data?.items ?? []).filter((t) => !jaVinculadas.has(t.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esta tarefa depende de</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dependencias.length === 0 ? (
            <EmptyState icon={GitBranch} title="Sem dependências" description="Esta tarefa não depende de nenhuma outra." />
          ) : (
            <ul className="space-y-2">
              {dependencias.map((dependency) => (
                <DependencyRow
                  key={dependency.id}
                  dependency={dependency}
                  removing={removeDependency.isPending}
                  onRemove={
                    canUpdate
                      ? () =>
                          removeDependency.mutate(
                            { tarefaId: taskId, dependeDeId: dependency.id },
                            { onError: () => toast.error('Não foi possível remover a dependência.') },
                          )
                      : undefined
                  }
                />
              ))}
            </ul>
          )}

          {canUpdate && (
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Select value={selecionado} onValueChange={setSelecionado}>
                <SelectTrigger className="flex-1" aria-label="Selecionar tarefa da qual esta depende">
                  <SelectValue placeholder="Selecionar tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selecionado || addDependency.isPending}
                onClick={() =>
                  addDependency.mutate(
                    { tarefaId: taskId, dependeDeId: selecionado },
                    {
                      onSuccess: () => setSelecionado(''),
                      onError: () => toast.error('Não foi possível adicionar a dependência.'),
                    },
                  )
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bloqueando</CardTitle>
        </CardHeader>
        <CardContent>
          {bloqueando.length === 0 ? (
            <EmptyState icon={GitBranch} title="Não bloqueia nenhuma tarefa" description="Nenhuma outra tarefa depende desta." />
          ) : (
            <ul className="space-y-2">
              {bloqueando.map((dependency) => (
                <DependencyRow key={dependency.id} dependency={dependency} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
