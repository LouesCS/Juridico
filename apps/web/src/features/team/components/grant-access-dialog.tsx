'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGrantAccess } from '../api/mutations';
import { RoleSelect } from './role-select';

/**
 * "Permitir acesso ao sistema" para um colaborador que hoje é
 * `temAcesso: false` (cadastro puro de RH) — `POST /members/:id/grant-access`
 * exige `papelId` (e opcionalmente confirma/atualiza o `email`). Reaproveita
 * `RoleSelect` (mesmo seletor do convite de membro), nunca um segundo.
 */
export function GrantAccessDialog({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  currentEmail: string;
}) {
  const [email, setEmail] = React.useState(currentEmail);
  const [papelId, setPapelId] = React.useState('');
  const grantAccess = useGrantAccess(collaboratorId);

  React.useEffect(() => {
    if (open) {
      setEmail(currentEmail);
      setPapelId('');
    }
  }, [open, currentEmail]);

  function handleSubmit() {
    grantAccess.mutate(
      { email: email || undefined, papelId },
      {
        onSuccess: () => {
          toast.success(`Acesso ao sistema concedido a ${collaboratorName}.`);
          onOpenChange(false);
        },
        onError: () => toast.error('Não foi possível conceder acesso ao sistema.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permitir acesso ao sistema</DialogTitle>
          <DialogDescription>
            {collaboratorName} receberá um convite por e-mail para criar uma conta e entrar no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grant-access-email">E-mail</Label>
            <Input
              id="grant-access-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <RoleSelect value={papelId || undefined} onChange={setPapelId} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} loading={grantAccess.isPending} disabled={!papelId}>
            Conceder acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
