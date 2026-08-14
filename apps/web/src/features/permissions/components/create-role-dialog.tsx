'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionCatalog } from '../api/queries';
import { useCreateRole } from '../api/mutations';
import { PermissionMatrix } from './permission-matrix';

/**
 * "COLABORADOR PERSONALIZADO" (Prompt 12 §Tipos de Usuário) — o mecanismo
 * é este diálogo: OWNER/quem tiver `role:manage` cria um perfil customizado
 * com o subconjunto de permissões que quiser, nunca um papel fixo no
 * catálogo. O backend garante o "teto de privilégio" (nunca conceder o que
 * o próprio ator não tem) e o nível hierárquico sempre um degrau abaixo de
 * quem criou.
 */
export function CreateRoleDialog({ atorPermissions }: { atorPermissions: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [permissoes, setPermissoes] = React.useState<string[]>([]);
  const { data: catalog, isLoading } = usePermissionCatalog(open);
  const createRole = useCreateRole();

  function reset() {
    setNome('');
    setDescricao('');
    setPermissoes([]);
  }

  function handleSubmit() {
    createRole.mutate(
      { nome, descricao: descricao || undefined, permissoes },
      {
        onSuccess: () => {
          toast.success(`Perfil "${nome}" criado.`);
          reset();
          setOpen(false);
        },
        onError: () => toast.error('Não foi possível criar o perfil.'),
      },
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Novo perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="scrollbar-fade max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo perfil customizado</DialogTitle>
          <DialogDescription>
            Escolha exatamente as permissões deste perfil — você só pode conceder as que você mesmo tem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-nome">Nome</Label>
              <Input id="role-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-descricao">Descrição (opcional)</Label>
              <Input id="role-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>

          {isLoading || !catalog ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <PermissionMatrix
              catalog={catalog}
              value={permissoes}
              onChange={setPermissoes}
              atorPermissions={atorPermissions}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createRole.isPending}
            disabled={!nome.trim() || permissoes.length === 0}
          >
            Criar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
