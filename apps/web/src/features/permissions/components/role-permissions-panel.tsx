'use client';

import * as React from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles, type RoleDTO } from '@/features/team';
import { usePermissionCatalog, useRoleDetail } from '../api/queries';
import { useDeleteRole, useUpdateRolePermissions } from '../api/mutations';
import { PermissionMatrix } from './permission-matrix';
import { CreateRoleDialog } from './create-role-dialog';

/**
 * Aba "Perfis e Permissões" — lista à esquerda (`useRoles`, reaproveitado
 * de `features/team`, mesma fonte que alimenta o seletor de papel no
 * convite de membro), detalhe/edição à direita. Perfis de sistema
 * (`ehSistema: true`) mostram a matriz só como referência (desabilitada,
 * nunca escondida) — reafirma "perfis de sistema têm permissões fixas" do
 * backend.
 */
export function RolePermissionsPanel({ atorPermissions }: { atorPermissions: string[] }) {
  const { data: roles, isLoading: rolesLoading, isError, refetch } = useRoles();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const selected = roles?.find((r) => r.id === selectedId) ?? null;

  if (isError) {
    return <ErrorState title="Não foi possível carregar os perfis." onRetry={() => refetch()} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Perfis</CardTitle>
          <CreateRoleDialog atorPermissions={atorPermissions} />
        </CardHeader>
        <CardContent className="space-y-1">
          {rolesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            roles?.map((role) => (
              <RoleRow key={role.id} role={role} active={role.id === selectedId} onSelect={() => setSelectedId(role.id)} />
            ))
          )}
        </CardContent>
      </Card>

      {!selected ? (
        <EmptyState icon={ShieldCheck} title="Selecione um perfil" description="Escolha um perfil na lista para ver ou editar suas permissões." />
      ) : (
        <RoleDetail
          role={selected}
          atorPermissions={atorPermissions}
          onDeleteRequest={() => setDeleteOpen(true)}
        />
      )}

      {selected && (
        <RoleDeleteDialog
          role={selected}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function RoleRow({ role, active, onSelect }: { role: RoleDTO; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={
        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ' +
        (active ? 'bg-accent font-medium' : 'hover:bg-accent/60')
      }
    >
      <span className="truncate">{role.nome}</span>
      {role.ehSistema && (
        <Badge variant="outline" className="shrink-0">
          Sistema
        </Badge>
      )}
    </button>
  );
}

function RoleDetail({
  role,
  atorPermissions,
  onDeleteRequest,
}: {
  role: RoleDTO;
  atorPermissions: string[];
  onDeleteRequest: () => void;
}) {
  const { data: detail, isLoading: detailLoading } = useRoleDetail(role.id, true);
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog(true);
  const updatePermissions = useUpdateRolePermissions(role.id);
  const [draft, setDraft] = React.useState<string[] | null>(null);

  React.useEffect(() => setDraft(null), [role.id]);

  const permissoes = draft ?? detail?.permissoes ?? [];
  const isLoading = detailLoading || catalogLoading || !catalog;
  const dirty = draft !== null;

  function handleSave() {
    if (!draft) return;
    updatePermissions.mutate(draft, {
      onSuccess: () => {
        toast.success('Permissões atualizadas.');
        setDraft(null);
      },
      onError: () => toast.error('Não foi possível atualizar as permissões.'),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{role.nome}</CardTitle>
          {role.descricao && <p className="text-sm text-muted-foreground">{role.descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button size="sm" onClick={handleSave} loading={updatePermissions.isPending}>
              Salvar alterações
            </Button>
          )}
          {!role.ehSistema && (
            <Button variant="outline" size="icon" aria-label={`Excluir ${role.nome}`} onClick={onDeleteRequest}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <PermissionMatrix
            catalog={catalog}
            value={permissoes}
            onChange={setDraft}
            atorPermissions={atorPermissions}
            disabled={role.ehSistema}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RoleDeleteDialog({
  role,
  open,
  onOpenChange,
  onDeleted,
}: {
  role: RoleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const deleteRole = useDeleteRole();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir perfil"
      description={`"${role.nome}" será excluído. Só é possível excluir um perfil sem membros atribuídos a ele.`}
      confirmLabel="Excluir"
      loading={deleteRole.isPending}
      onConfirm={() =>
        deleteRole.mutate(role.id, {
          onSuccess: () => {
            toast.success('Perfil excluído.');
            onOpenChange(false);
            onDeleted();
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(
              code === 'ROLE_IN_USE'
                ? 'Este perfil está atribuído a membros ativos — remova-os antes de excluir.'
                : 'Não foi possível excluir este perfil.',
            );
          },
        })
      }
    />
  );
}
