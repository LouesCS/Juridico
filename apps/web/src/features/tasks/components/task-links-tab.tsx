'use client';

import * as React from 'react';
import Link from 'next/link';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermission } from '@/hooks/use-permission';
import { useAddTaskLink, useRemoveTaskLink } from '../api/mutations';
import { TASK_LINK_TYPES, type TaskLinkDTO, type TaskLinkType } from '../api/tasks.api';

const LINK_TYPE_LABEL: Record<TaskLinkType, string> = {
  CLIENTE: 'Cliente',
  PROCESSO: 'Processo',
  DOCUMENTO: 'Documento',
  CONTRATO: 'Contrato',
  SERVICO: 'Serviço',
  FINANCEIRO: 'Financeiro',
  PUBLICACAO: 'Publicação',
  PEDIDO: 'Pedido',
  REGISTRO_TRABALHO: 'Registro de trabalho',
  PASTA_JURIDICA: 'Pasta Jurídica',
  MOVIMENTACAO_EXTRAJUDICIAL: 'Movimentação extrajudicial',
  MOVIMENTACAO_JUDICIAL: 'Movimentação judicial',
};

/** Só CLIENTE/PROCESSO/DOCUMENTO têm rota real hoje — ver `RECURSOS_VALIDAVEIS` no backend. */
function hrefFor(vinculo: TaskLinkDTO): string | null {
  if (vinculo.tipoRecurso === 'CLIENTE') return `/clientes/${vinculo.recursoId}`;
  if (vinculo.tipoRecurso === 'PROCESSO') return `/processos/${vinculo.recursoId}`;
  if (vinculo.tipoRecurso === 'DOCUMENTO') return `/documentos/${vinculo.recursoId}`;
  if (vinculo.tipoRecurso === 'PASTA_JURIDICA') return `/pastas/${vinculo.recursoId}`;
  if (vinculo.tipoRecurso === 'MOVIMENTACAO_EXTRAJUDICIAL')
    return `/movimentacoes-extrajudiciais/${vinculo.recursoId}`;
  if (vinculo.tipoRecurso === 'MOVIMENTACAO_JUDICIAL')
    return `/movimentacoes-judiciais/${vinculo.recursoId}`;
  return null;
}

/**
 * "Vínculos" (Prompt 14) — Cliente/Processo/Documento/Contrato/Serviço/
 * Financeiro/Publicação/Pedido/Registro de trabalho. Sem um seletor de
 * busca por recurso (ainda não existe um picker unificado para os 9
 * tipos); o ID é colado diretamente — honesto sobre a capacidade atual em
 * vez de simular uma busca que não existe.
 */
export function TaskLinksTab({ taskId, vinculos }: { taskId: string; vinculos: TaskLinkDTO[] }) {
  const canUpdate = usePermission('task:update');
  const [tipoRecurso, setTipoRecurso] = React.useState<TaskLinkType>('CLIENTE');
  const [recursoId, setRecursoId] = React.useState('');
  const addLink = useAddTaskLink();
  const removeLink = useRemoveTaskLink();

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {vinculos.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="Sem vínculos"
            description="Esta tarefa não está vinculada a nenhum recurso ainda."
          />
        ) : (
          <ul className="space-y-2">
            {vinculos.map((vinculo) => {
              const href = hrefFor(vinculo);
              return (
                <li
                  key={vinculo.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline">{LINK_TYPE_LABEL[vinculo.tipoRecurso]}</Badge>
                    {href ? (
                      <Link href={href} className="truncate text-sm hover:underline">
                        {vinculo.recursoId}
                      </Link>
                    ) : (
                      <span className="truncate text-sm text-muted-foreground">
                        {vinculo.recursoId}
                      </span>
                    )}
                  </div>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover vínculo"
                      onClick={() =>
                        removeLink.mutate(
                          { tarefaId: taskId, vinculoId: vinculo.id },
                          { onError: () => toast.error('Não foi possível remover o vínculo.') },
                        )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canUpdate && (
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Select value={tipoRecurso} onValueChange={(v) => setTipoRecurso(v as TaskLinkType)}>
              <SelectTrigger className="w-44" aria-label="Tipo de recurso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_LINK_TYPES.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {LINK_TYPE_LABEL[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="ID do recurso"
              value={recursoId}
              onChange={(event) => setRecursoId(event.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={!recursoId.trim() || addLink.isPending}
              onClick={() =>
                addLink.mutate(
                  { tarefaId: taskId, input: { tipoRecurso, recursoId: recursoId.trim() } },
                  {
                    onSuccess: () => setRecursoId(''),
                    onError: () =>
                      toast.error(
                        'Não foi possível adicionar o vínculo. Verifique se o ID existe.',
                      ),
                  },
                )
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Vincular
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
