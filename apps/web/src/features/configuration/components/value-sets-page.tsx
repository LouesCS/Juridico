'use client';

import * as React from 'react';
import { ListTree, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import type { ValueSetDTO } from '../api/configuration.api';
import {
  useAddValueSetItem,
  useCreateValueSet,
  useDeleteValueSet,
  useRemoveValueSetItem,
} from '../api/mutations';
import { useValueSets } from '../api/queries';

export function ValueSetsPage() {
  const { data: conjuntos, isLoading, isError, refetch } = useValueSets();
  const canManage = usePermission('configuration:manage');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ValueSetDTO | null>(null);
  const deleteSet = useDeleteValueSet();

  const selected = conjuntos?.find((c) => c.id === selectedId) ?? null;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Conjuntos</CardTitle>
          {canManage && <CreateValueSetDialog />}
        </CardHeader>
        <CardContent className="space-y-1">
          {!conjuntos || conjuntos.length === 0 ? (
            <EmptyState icon={ListTree} title="Nenhum conjunto criado" />
          ) : (
            conjuntos.map((conjunto) => (
              <button
                key={conjunto.id}
                type="button"
                onClick={() => setSelectedId(conjunto.id)}
                aria-current={conjunto.id === selectedId ? 'true' : undefined}
                className={
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ' +
                  (conjunto.id === selectedId ? 'bg-accent font-medium' : 'hover:bg-accent/60')
                }
              >
                <span className="truncate">{conjunto.nome}</span>
                <Badge variant="outline" className="shrink-0">
                  {conjunto.itens.length}
                </Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {!selected ? (
        <EmptyState
          icon={ListTree}
          title="Selecione um conjunto"
          description="Escolha um conjunto na lista para ver ou editar seus valores."
        />
      ) : (
        <ValueSetDetail
          conjunto={selected}
          canManage={canManage}
          onDeleteRequest={() => setDeleteTarget(selected)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir conjunto de valores"
          description={`"${deleteTarget.nome}" e seus ${deleteTarget.itens.length} valor(es) serão removidos.`}
          confirmLabel="Excluir"
          loading={deleteSet.isPending}
          onConfirm={() =>
            deleteSet.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Conjunto excluído.');
                setDeleteTarget(null);
                setSelectedId(null);
              },
              onError: () => toast.error('Não foi possível excluir o conjunto.'),
            })
          }
        />
      )}
    </div>
  );
}

function ValueSetDetail({
  conjunto,
  canManage,
  onDeleteRequest,
}: {
  conjunto: ValueSetDTO;
  canManage: boolean;
  onDeleteRequest: () => void;
}) {
  const [novoValor, setNovoValor] = React.useState('');
  const addItem = useAddValueSetItem();
  const removeItem = useRemoveValueSetItem();

  function handleAdd() {
    if (!novoValor.trim()) return;
    addItem.mutate(
      { conjuntoId: conjunto.id, valor: novoValor.trim() },
      {
        onSuccess: () => setNovoValor(''),
        onError: () => toast.error('Não foi possível adicionar o valor.'),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{conjunto.nome}</CardTitle>
          {conjunto.descricao && <p className="text-sm text-muted-foreground">{conjunto.descricao}</p>}
        </div>
        {canManage && (
          <Button variant="outline" size="icon" aria-label={`Excluir ${conjunto.nome}`} onClick={onDeleteRequest}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {conjunto.itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum valor cadastrado ainda.</p>
        ) : (
          <ul className="space-y-1">
            {conjunto.itens.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
              >
                {item.valor}
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remover ${item.valor}`}
                    onClick={() => removeItem.mutate({ conjuntoId: conjunto.id, itemId: item.id })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="flex gap-2">
            <Input
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder="Novo valor"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} loading={addItem.isPending} disabled={!novoValor.trim()}>
              <Plus className="size-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateValueSetDialog() {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const createSet = useCreateValueSet();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNome('');
      setDescricao('');
    }
  }

  function handleSubmit() {
    createSet.mutate(
      { nome, descricao: descricao || undefined },
      {
        onSuccess: () => {
          toast.success(`Conjunto "${nome}" criado.`);
          handleOpenChange(false);
        },
        onError: (error) => {
          const code = (error as { code?: string })?.code;
          toast.error(code === 'DUPLICATE_NAME' ? 'Já existe um conjunto com este nome.' : 'Não foi possível criar o conjunto.');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden="true" />
          Novo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo conjunto de valores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="conjunto-nome">Nome</Label>
            <Input id="conjunto-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conjunto-descricao">Descrição (opcional)</Label>
            <Input id="conjunto-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={createSet.isPending} disabled={!nome.trim()}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
