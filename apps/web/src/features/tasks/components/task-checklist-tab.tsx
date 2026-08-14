'use client';

import * as React from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermission } from '@/hooks/use-permission';
import { useAddChecklistItem, useRemoveChecklistItem, useUpdateChecklistItem } from '../api/mutations';
import type { TaskChecklistItemDTO } from '../api/tasks.api';

/**
 * Item obrigatório pendente bloqueia `POST /tasks/:id/complete`
 * (`TASK_CHECKLIST_PENDING`) — o badge "Obrigatório" aqui é o mesmo sinal
 * que o backend usa para bloquear a conclusão, nunca um rótulo cosmético.
 */
export function TaskChecklistTab({ taskId, checklist }: { taskId: string; checklist: TaskChecklistItemDTO[] }) {
  const canUpdate = usePermission('task:update');
  const [novoTitulo, setNovoTitulo] = React.useState('');
  const [novoObrigatorio, setNovoObrigatorio] = React.useState(false);
  const addItem = useAddChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const removeItem = useRemoveChecklistItem();

  const ordenado = [...checklist].sort((a, b) => a.ordem - b.ordem);
  const concluidos = ordenado.filter((item) => item.concluidoEm).length;

  function handleAdd() {
    if (!novoTitulo.trim()) return;
    addItem.mutate(
      { tarefaId: taskId, input: { titulo: novoTitulo.trim(), obrigatorio: novoObrigatorio, ordem: ordenado.length } },
      {
        onSuccess: () => {
          setNovoTitulo('');
          setNovoObrigatorio(false);
        },
        onError: () => toast.error('Não foi possível adicionar o item.'),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {ordenado.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {concluidos} de {ordenado.length} concluído(s)
          </p>
        )}

        {ordenado.length === 0 ? (
          <EmptyState icon={ListChecks} title="Sem checklist" description="Nenhum item de checklist nesta tarefa ainda." />
        ) : (
          <ul className="space-y-2">
            {ordenado.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Checkbox
                  checked={!!item.concluidoEm}
                  disabled={!canUpdate}
                  onCheckedChange={(checked) =>
                    updateItem.mutate(
                      { tarefaId: taskId, itemId: item.id, input: { concluido: !!checked } },
                      { onError: () => toast.error('Não foi possível atualizar o item.') },
                    )
                  }
                  aria-label={`Marcar "${item.titulo}" como concluído`}
                />
                <span className={`flex-1 text-sm ${item.concluidoEm ? 'text-muted-foreground line-through' : ''}`}>
                  {item.titulo}
                </span>
                {item.obrigatorio && <Badge variant="outline">Obrigatório</Badge>}
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.titulo}`}
                    onClick={() =>
                      removeItem.mutate(
                        { tarefaId: taskId, itemId: item.id },
                        { onError: () => toast.error('Não foi possível remover o item.') },
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canUpdate && (
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Input
              placeholder="Novo item do checklist"
              value={novoTitulo}
              onChange={(event) => setNovoTitulo(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox checked={novoObrigatorio} onCheckedChange={(checked) => setNovoObrigatorio(!!checked)} />
              Obrigatório
            </label>
            <Button size="sm" disabled={!novoTitulo.trim() || addItem.isPending} onClick={handleAdd}>
              <Plus className="size-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
