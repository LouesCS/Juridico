'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionMatrix, usePermissionCatalog, useRoleDetail, useUpdateRolePermissions } from '@/features/permissions';

/**
 * Conteúdo reaproveitável de "Configurar permissões" de um colaborador
 * (Sprint "Colaboradores") — o modelo de permissões deste app é por Papel
 * (`papel`/`RoleDTO`), não por membro individual (reafirma
 * `features/permissions/`); casca fina em cima de `PermissionMatrix`/
 * `useRoleDetail`/`useUpdateRolePermissions` — os MESMOS hooks/componente
 * de `role-permissions-panel.tsx`, nunca um segundo motor de permissões.
 * Extraído como painel próprio para ser usado tanto dentro do modal
 * (`CollaboratorPermissionsDialog`, ações rápidas) quanto embutido direto
 * na aba "Permissões" da página de detalhes (`collaborator-detail-page.tsx`).
 */
export function CollaboratorPermissionsPanel({
  papel,
  atorPermissions,
  footerClassName,
}: {
  papel: { id: string; nome: string } | null;
  atorPermissions: string[];
  footerClassName?: string;
}) {
  const { data: detail, isLoading: detailLoading } = useRoleDetail(papel?.id ?? null, !!papel);
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog(!!papel);
  const updatePermissions = useUpdateRolePermissions(papel?.id ?? '');
  const [draft, setDraft] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    setDraft(null);
  }, [papel?.id]);

  if (!papel) {
    return <p className="text-sm text-muted-foreground">Este colaborador não tem papel de sistema atribuído.</p>;
  }

  const permissoes = draft ?? detail?.permissoes ?? [];
  const isLoading = detailLoading || catalogLoading || !catalog;
  const dirty = draft !== null;

  function handleSave() {
    if (!draft) return;
    updatePermissions.mutate(draft, {
      onSuccess: () => {
        toast.success(`Permissões do papel "${papel?.nome}" atualizadas.`);
        setDraft(null);
      },
      onError: () => toast.error('Não foi possível atualizar as permissões.'),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Estas permissões valem para todos os colaboradores com o papel &ldquo;{papel.nome}&rdquo;, não só este.
      </p>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <PermissionMatrix
          catalog={catalog}
          value={permissoes}
          onChange={setDraft}
          atorPermissions={atorPermissions}
          disabled={detail?.ehSistema}
        />
      )}
      {dirty && (
        <div className={footerClassName ?? 'flex justify-end'}>
          <Button type="button" onClick={handleSave} loading={updatePermissions.isPending}>
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}

export function CollaboratorPermissionsDialog({
  open,
  onOpenChange,
  papel,
  atorPermissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  papel: { id: string; nome: string } | null;
  atorPermissions: string[];
}) {
  if (!papel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Permissões do papel &ldquo;{papel.nome}&rdquo;</DialogTitle>
          <DialogDescription>Reaproveita a mesma matriz de permissões de Configurações → Permissões.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <CollaboratorPermissionsPanel papel={papel} atorPermissions={atorPermissions} />
        </DialogBody>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
