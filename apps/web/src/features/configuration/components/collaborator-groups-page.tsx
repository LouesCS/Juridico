'use client';

import * as React from 'react';
import { Plus, Trash2, UsersRound, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { useMembers } from '@/features/team';
import type { CollaboratorGroupDTO } from '../api/configuration.api';
import {
  useAddCollaboratorGroupMember,
  useCreateCollaboratorGroup,
  useDeleteCollaboratorGroup,
  useRemoveCollaboratorGroupMember,
} from '../api/mutations';
import { useCollaboratorGroups } from '../api/queries';

export function CollaboratorGroupsPage() {
  const { data: grupos, isLoading, isError, refetch } = useCollaboratorGroups();
  const canManage = usePermission('configuration:manage');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CollaboratorGroupDTO | null>(null);
  const deleteGroup = useDeleteCollaboratorGroup();

  const selected = grupos?.find((g) => g.id === selectedId) ?? null;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Grupos</CardTitle>
          {canManage && <CreateGroupDialog />}
        </CardHeader>
        <CardContent className="space-y-1">
          {!grupos || grupos.length === 0 ? (
            <EmptyState icon={UsersRound} title="Nenhum grupo criado" />
          ) : (
            grupos.map((grupo) => (
              <button
                key={grupo.id}
                type="button"
                onClick={() => setSelectedId(grupo.id)}
                aria-current={grupo.id === selectedId ? 'true' : undefined}
                className={
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ' +
                  (grupo.id === selectedId ? 'bg-accent font-medium' : 'hover:bg-accent/60')
                }
              >
                <span className="truncate">{grupo.nome}</span>
                <Badge variant="outline" className="shrink-0">
                  {grupo.membros.length}
                </Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {!selected ? (
        <EmptyState
          icon={UsersRound}
          title="Selecione um grupo"
          description="Escolha um grupo na lista para ver ou editar seus membros."
        />
      ) : (
        <GroupDetail group={selected} canManage={canManage} onDeleteRequest={() => setDeleteTarget(selected)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir grupo de colaboradores"
          description={`"${deleteTarget.nome}" será removido.`}
          confirmLabel="Excluir"
          loading={deleteGroup.isPending}
          onConfirm={() =>
            deleteGroup.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Grupo excluído.');
                setDeleteTarget(null);
                setSelectedId(null);
              },
              onError: () => toast.error('Não foi possível excluir o grupo.'),
            })
          }
        />
      )}
    </div>
  );
}

function GroupDetail({
  group,
  canManage,
  onDeleteRequest,
}: {
  group: CollaboratorGroupDTO;
  canManage: boolean;
  onDeleteRequest: () => void;
}) {
  const { data: membros } = useMembers();
  const addMember = useAddCollaboratorGroupMember();
  const removeMember = useRemoveCollaboratorGroupMember();
  const [selecionado, setSelecionado] = React.useState('');

  const candidatos = (membros ?? []).filter((m) => !group.membros.some((gm) => gm.id === m.id));

  function handleAdd() {
    if (!selecionado) return;
    addMember.mutate(
      { grupoId: group.id, membroId: selecionado },
      {
        onSuccess: () => setSelecionado(''),
        onError: () => toast.error('Não foi possível adicionar o colaborador.'),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{group.nome}</CardTitle>
          {group.descricao && <p className="text-sm text-muted-foreground">{group.descricao}</p>}
        </div>
        {canManage && (
          <Button variant="outline" size="icon" aria-label={`Excluir ${group.nome}`} onClick={onDeleteRequest}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {group.membros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador neste grupo ainda.</p>
        ) : (
          <ul className="space-y-1">
            {group.membros.map((membro) => (
              <li
                key={membro.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
              >
                {membro.nome}
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remover ${membro.nome}`}
                    onClick={() => removeMember.mutate({ grupoId: group.id, membroId: membro.id })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && candidatos.length > 0 && (
          <div className="flex gap-2">
            <Select value={selecionado} onValueChange={setSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher colaborador" />
              </SelectTrigger>
              <SelectContent>
                {candidatos.map((membro) => (
                  <SelectItem key={membro.id} value={membro.id}>
                    {membro.usuario.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} loading={addMember.isPending} disabled={!selecionado}>
              <Plus className="size-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateGroupDialog() {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const createGroup = useCreateCollaboratorGroup();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNome('');
      setDescricao('');
    }
  }

  function handleSubmit() {
    createGroup.mutate(
      { nome, descricao: descricao || undefined },
      {
        onSuccess: () => {
          toast.success(`Grupo "${nome}" criado.`);
          handleOpenChange(false);
        },
        onError: (error) => {
          const code = (error as { code?: string })?.code;
          toast.error(code === 'DUPLICATE_NAME' ? 'Já existe um grupo com este nome.' : 'Não foi possível criar o grupo.');
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
          <DialogTitle>Novo grupo de colaboradores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grupo-nome">Nome</Label>
            <Input id="grupo-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grupo-descricao">Descrição (opcional)</Label>
            <Input id="grupo-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={createGroup.isPending} disabled={!nome.trim()}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
