'use client';

import * as React from 'react';
import { Pencil, Trash2, UserCog } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import type { CargoDTO } from '../api/configuration.api';
import { useCreateCargo, useDeleteCargo, useUpdateCargo } from '../api/mutations';
import { useCargos } from '../api/queries';

/**
 * Clona o padrão de `task-categories-page.tsx` (catálogo plano + diálogo
 * único create/edit) — mesma estrutura pedida para `/configuracoes/cargos`.
 * Campos: nome, descrição, ordem, ativo (o catálogo de Grupos de
 * Colaboradores/Categorias de Tarefa não tem `ordem` editável na UI hoje;
 * aqui vira um `Input type="number"` simples, sem drag-and-drop — fora do
 * escopo desta Sprint).
 */
export function CargosPage() {
  const { data: cargos, isLoading, isError, refetch } = useCargos();
  const canManage = usePermission('configuration:manage');
  const [deleteTarget, setDeleteTarget] = React.useState<CargoDTO | null>(null);
  const deleteCargo = useDeleteCargo();
  const updateCargo = useUpdateCargo();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <CargoDialog mode="create" />}</div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !cargos || cargos.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum cargo cadastrado"
          description="Cargos organizam colaboradores (ex.: Advogado, Estagiário, Analista Administrativo)."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...cargos]
              .sort((a, b) => a.ordem - b.ordem)
              .map((cargo) => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-medium">{cargo.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{cargo.descricao ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{cargo.ordem}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Switch
                        checked={cargo.ativo}
                        aria-label={`Ativar/desativar ${cargo.nome}`}
                        onCheckedChange={(checked) =>
                          updateCargo.mutate(
                            { id: cargo.id, input: { ativo: checked } },
                            { onError: () => toast.error('Não foi possível atualizar o status do cargo.') },
                          )
                        }
                      />
                    ) : (
                      <Badge variant={cargo.ativo ? 'success' : 'secondary'}>
                        {cargo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <CargoDialog mode="edit" cargo={cargo} />
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Excluir ${cargo.nome}`}
                          onClick={() => setDeleteTarget(cargo)}
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
          title="Excluir cargo"
          description={`"${deleteTarget.nome}" será removido. Colaboradores com este cargo ficam sem cargo, nunca são excluídos.`}
          confirmLabel="Excluir"
          loading={deleteCargo.isPending}
          onConfirm={() =>
            deleteCargo.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Cargo excluído.');
                setDeleteTarget(null);
              },
              onError: () => toast.error('Não foi possível excluir o cargo.'),
            })
          }
        />
      )}
    </div>
  );
}

function CargoDialog({ mode, cargo }: { mode: 'create' | 'edit'; cargo?: CargoDTO }) {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState(cargo?.nome ?? '');
  const [descricao, setDescricao] = React.useState(cargo?.descricao ?? '');
  const [ordem, setOrdem] = React.useState(String(cargo?.ordem ?? 0));
  const createCargo = useCreateCargo();
  const updateCargo = useUpdateCargo();
  const isPending = createCargo.isPending || updateCargo.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && mode === 'create') {
      setNome('');
      setDescricao('');
      setOrdem('0');
    }
  }

  function handleSubmit() {
    const ordemNumero = Number(ordem) || 0;
    if (mode === 'create') {
      createCargo.mutate(
        { nome, descricao: descricao || undefined, ordem: ordemNumero },
        {
          onSuccess: () => {
            toast.success(`Cargo "${nome}" criado.`);
            handleOpenChange(false);
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(code === 'DUPLICATE_NAME' ? 'Já existe um cargo com este nome.' : 'Não foi possível criar o cargo.');
          },
        },
      );
    } else if (cargo) {
      updateCargo.mutate(
        { id: cargo.id, input: { nome, descricao: descricao || null, ordem: ordemNumero } },
        {
          onSuccess: () => {
            toast.success('Cargo atualizado.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar o cargo.'),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>Novo cargo</Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={`Editar ${cargo?.nome}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo cargo' : 'Editar cargo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cargo-nome">Nome</Label>
            <Input id="cargo-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cargo-descricao">Descrição (opcional)</Label>
            <Input id="cargo-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cargo-ordem">Ordem</Label>
            <Input id="cargo-ordem" type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
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
