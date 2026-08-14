'use client';

import * as React from 'react';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import type { TaskTemplateDTO } from '../api/configuration.api';
import { useCreateTaskTemplate, useDeleteTaskTemplate, useUpdateTaskTemplate } from '../api/mutations';
import { useTaskCategories, useTaskTemplates } from '../api/queries';

const PRIORIDADE_LABELS: Record<TaskTemplateDTO['prioridadePadrao'], string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

/**
 * Consumido pelo Task Engine (Prompt 14) — "Criar tarefa a partir do
 * modelo" (`features/tasks`) lê estes modelos via
 * `configurationApi.listTaskTemplates()`; esta tela continua sendo o único
 * lugar onde eles são criados/editados (Configuration Engine, Prompt 13).
 */
export function TaskTemplatesPage() {
  const { data: modelos, isLoading, isError, refetch } = useTaskTemplates();
  const canManage = usePermission('configuration:manage');
  const [deleteTarget, setDeleteTarget] = React.useState<TaskTemplateDTO | null>(null);
  const deleteTemplate = useDeleteTaskTemplate();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <TaskTemplateDialog mode="create" />}</div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !modelos || modelos.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhum modelo de tarefa cadastrado"
          description="Modelos de tarefa aceleram a criação de tarefas recorrentes com prazo e checklist padrão."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Prazo padrão</TableHead>
              <TableHead>Prioridade</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelos.map((modelo) => (
              <TableRow key={modelo.id}>
                <TableCell className="font-medium">{modelo.nome}</TableCell>
                <TableCell>
                  {modelo.categoria ? (
                    <Badge variant="outline" style={{ borderColor: modelo.categoria.cor }}>
                      {modelo.categoria.nome}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{modelo.prazoDiasPadrao} dia(s)</TableCell>
                <TableCell>{PRIORIDADE_LABELS[modelo.prioridadePadrao]}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TaskTemplateDialog mode="edit" template={modelo} />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Excluir ${modelo.nome}`}
                        onClick={() => setDeleteTarget(modelo)}
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
          title="Excluir modelo de tarefa"
          description={`"${deleteTarget.nome}" será removido.`}
          confirmLabel="Excluir"
          loading={deleteTemplate.isPending}
          onConfirm={() =>
            deleteTemplate.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Modelo excluído.');
                setDeleteTarget(null);
              },
              onError: () => toast.error('Não foi possível excluir o modelo.'),
            })
          }
        />
      )}
    </div>
  );
}

function TaskTemplateDialog({ mode, template }: { mode: 'create' | 'edit'; template?: TaskTemplateDTO }) {
  const { data: categorias } = useTaskCategories();
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState(template?.nome ?? '');
  const [categoriaId, setCategoriaId] = React.useState(template?.categoriaId ?? '');
  const [prazoDiasPadrao, setPrazoDiasPadrao] = React.useState(template?.prazoDiasPadrao ?? 0);
  const [prioridadePadrao, setPrioridadePadrao] = React.useState<TaskTemplateDTO['prioridadePadrao']>(
    template?.prioridadePadrao ?? 'MEDIA',
  );
  const [checklistTexto, setChecklistTexto] = React.useState((template?.checklist ?? []).join('\n'));

  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && mode === 'create') {
      setNome('');
      setCategoriaId('');
      setPrazoDiasPadrao(0);
      setPrioridadePadrao('MEDIA');
      setChecklistTexto('');
    }
  }

  function handleSubmit() {
    const checklist = checklistTexto
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (mode === 'create') {
      createTemplate.mutate(
        {
          nome,
          categoriaId: categoriaId || undefined,
          prazoDiasPadrao,
          prioridadePadrao,
          checklist,
        },
        {
          onSuccess: () => {
            toast.success(`Modelo "${nome}" criado.`);
            handleOpenChange(false);
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(code === 'DUPLICATE_NAME' ? 'Já existe um modelo com este nome.' : 'Não foi possível criar o modelo.');
          },
        },
      );
    } else if (template) {
      updateTemplate.mutate(
        {
          id: template.id,
          input: { nome, categoriaId: categoriaId || null, prazoDiasPadrao, prioridadePadrao, checklist },
        },
        {
          onSuccess: () => {
            toast.success('Modelo atualizado.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar o modelo.'),
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
            Novo modelo
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={`Editar ${template?.nome}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="scrollbar-fade max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo modelo de tarefa' : 'Editar modelo de tarefa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="modelo-nome">Nome</Label>
            <Input id="modelo-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria (opcional)</Label>
              <Select value={categoriaId || '__none__'} onValueChange={(v) => setCategoriaId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem categoria</SelectItem>
                  {(categorias ?? []).map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade padrão</Label>
              <Select
                value={prioridadePadrao}
                onValueChange={(v) => setPrioridadePadrao(v as TaskTemplateDTO['prioridadePadrao'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modelo-prazo">Prazo padrão (dias)</Label>
            <Input
              id="modelo-prazo"
              type="number"
              min={0}
              value={prazoDiasPadrao}
              onChange={(e) => setPrazoDiasPadrao(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modelo-checklist">Checklist padrão (um item por linha)</Label>
            <textarea
              id="modelo-checklist"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={checklistTexto}
              onChange={(e) => setChecklistTexto(e.target.value)}
            />
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
