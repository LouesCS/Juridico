'use client';

import * as React from 'react';
import { Mail, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useInvitations } from '../api/queries';
import { useResendInvitation, useRevokeInvitation } from '../api/mutations';
import type { InvitationDTO } from '../api/team.api';

/**
 * `GET /invitations` só retorna convites `PENDENTE` (filtro do próprio
 * use case real) — não há "convite expirado" na listagem, o backend
 * apenas deixa de aceitar quando `expiraEm` já passou (mesmo `NOT_FOUND`
 * neutro do aceite, §6.4).
 */
export function InvitationsTable() {
  const { data: invitations, isLoading, isError, refetch } = useInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const [invitationToRevoke, setInvitationToRevoke] = React.useState<InvitationDTO | null>(null);

  if (isError) {
    return <ErrorState title="Não foi possível carregar os convites." onRetry={() => refetch()} />;
  }

  function handleResend(invitation: InvitationDTO) {
    resend.mutate(invitation.id, {
      onSuccess: () => toast.success(`Convite reenviado para ${invitation.email}.`),
      onError: () => toast.error('Não foi possível reenviar o convite.'),
    });
  }

  function handleRevokeConfirm() {
    if (!invitationToRevoke) return;
    revoke.mutate(invitationToRevoke.id, {
      onSuccess: () => {
        toast.success(`Convite para ${invitationToRevoke.email} revogado.`);
        setInvitationToRevoke(null);
      },
      onError: () => {
        toast.error('Não foi possível revogar o convite.');
        setInvitationToRevoke(null);
      },
    });
  }

  const columns: DataTableColumn<InvitationDTO>[] = [
    { key: 'email', header: 'E-mail', render: (invitation) => invitation.email },
    {
      key: 'expiraEm',
      header: 'Expira em',
      render: (invitation) => new Date(invitation.expiraEm).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (invitation) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Reenviar convite para ${invitation.email}`}
            onClick={() => handleResend(invitation)}
            disabled={resend.isPending}
          >
            <RotateCw className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Revogar convite para ${invitation.email}`}
            onClick={() => setInvitationToRevoke(invitation)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={invitations ?? []}
        rowKey={(invitation) => invitation.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState icon={Mail} title="Nenhum convite pendente" description="Convites enviados aparecem aqui até serem aceitos, revogados ou expirarem." />
        }
      />
      <ConfirmDialog
        open={!!invitationToRevoke}
        onOpenChange={(open) => !open && setInvitationToRevoke(null)}
        title="Revogar convite"
        description={`O convite para ${invitationToRevoke?.email} deixará de ser válido.`}
        confirmLabel="Revogar"
        loading={revoke.isPending}
        onConfirm={handleRevokeConfirm}
      />
    </div>
  );
}
