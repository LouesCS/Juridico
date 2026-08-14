'use client';

import * as React from 'react';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import type { TaskCategoryDTO } from '../api/configuration.api';
import { useCreateTaskCategory, useDeleteTaskCategory, useUpdateTaskCategory } from '../api/mutations';
import { useTaskCategories } from '../api/queries';

export function TaskCategoriesPage() {
  const { data: categorias, isLoading, isError, refetch } = useTaskCategories();
  const canManage = usePermission('configuration:manage');
  const [deleteTarget, setDeleteTarget] = React.useState<TaskCategoryDTO | null>(null);
  const deleteCategory = useDeleteTaskCategory();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <TaskCategoryDialog mode="create" />}</div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !categorias || categorias.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhuma categoria de tarefa cadastrada"
          description="Categorias organizam tarefas e modelos de tarefa por cor."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell className="font-medium">{categoria.nome}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-3 rounded-full border border-border"
                      style={{ backgroundColor: categoria.cor }}
                      aria-hidden="true"
                    />
                    {categoria.cor}
                  </span>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TaskCategoryDialog mode="edit" category={categoria} />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Excluir ${categoria.nome}`}
                        onClick={() => setDeleteTarget(categoria)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir categoria de tarefa"
          description={`"${deleteTarget.nome}" será removida. Modelos de tarefa vinculados a ela ficam sem categoria, nunca são excluídos.`}
          confirmLabel="Excluir"
          loading={deleteCategory.isPending}
          onConfirm={() =>
            deleteCategory.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Categoria excluída.');
                setDeleteTarget(null);
              },
              onError: () => toast.error('Não foi possível excluir a categoria.'),
            })
          }
        />
      )}
    </div>
  );
}

function TaskCategoryDialog({ mode, category }: { mode: 'create' | 'edit'; category?: TaskCategoryDTO }) {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState(category?.nome ?? '');
  const [cor, setCor] = React.useState(category?.cor ?? '#6366F1');
  const createCategory = useCreateTaskCategory();
  const updateCategory = useUpdateTaskCategory();
  const isPending = createCategory.isPending || updateCategory.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && mode === 'create') {
      setNome('');
      setCor('#6366F1');
    }
  }

  function handleSubmit() {
    if (mode === 'create') {
      createCategory.mutate(
        { nome, cor },
        {
          onSuccess: () => {
            toast.success(`Categoria "${nome}" criada.`);
            handleOpenChange(false);
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(code === 'DUPLICATE_NAME' ? 'Já existe uma categoria com este nome.' : 'Não foi possível criar a categoria.');
          },
        },
      );
    } else if (category) {
      updateCategory.mutate(
        { id: category.id, input: { nome, cor } },
        {
          onSuccess: () => {
            toast.success('Categoria atualizada.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar a categoria.'),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Nova categoria
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={`Editar ${category?.nome}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova categoria de tarefa' : 'Editar categoria de tarefa'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input id="categoria-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria-cor">Cor</Label>
            <Input id="categoria-cor" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 p-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!nome.trim()}>
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
