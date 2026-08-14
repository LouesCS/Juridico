'use client';

import * as React from 'react';
import { Laptop } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { useSessions } from '../api/queries';
import { useRevokeSession } from '../api/mutations';
import type { SessionDTO } from '../api/profile.api';

/**
 * "Encerrar todas as sessões" pedido pelo Prompt 6C **não tem endpoint
 * real wireado**: `RevokeSessionUseCase.executeAllExceptCurrent` existe
 * no backend mas nenhuma rota do `identity.controller.ts` o chama —
 * reafirma docs/frontend-implementation/19-decisions.md. Botão mostrado
 * desabilitado com explicação, não removido silenciosamente nem
 * simulado.
 */
export function SessionsList() {
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const revokeSession = useRevokeSession();
  const [sessionToRevoke, setSessionToRevoke] = React.useState<SessionDTO | null>(null);

  if (isError) {
    return <ErrorState title="Não foi possível carregar suas sessões." onRetry={() => refetch()} />;
  }

  function handleRevokeConfirm() {
    if (!sessionToRevoke) return;
    revokeSession.mutate(sessionToRevoke.id, {
      onSuccess: () => {
        toast.success('Sessão encerrada.');
        setSessionToRevoke(null);
      },
      onError: () => {
        toast.error('Não foi possível encerrar esta sessão.');
        setSessionToRevoke(null);
      },
    });
  }

  const columns: DataTableColumn<SessionDTO>[] = [
    {
      key: 'dispositivo',
      header: 'Dispositivo',
      render: (session) => (
        <div className="flex items-center gap-2">
          <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{session.dispositivo ?? 'Dispositivo desconhecido'}</span>
          {session.atual && <Badge variant="secondary">Sessão atual</Badge>}
        </div>
      ),
    },
    { key: 'ip', header: 'IP', render: (session) => session.ip ?? '—' },
    {
      key: 'ultimoUsoEm',
      header: 'Último uso',
      render: (session) => new Date(session.ultimoUsoEm).toLocaleString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (session) =>
        session.atual ? null : (
          <Button variant="ghost" size="sm" onClick={() => setSessionToRevoke(session)}>
            Encerrar
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sessões ativas</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                Encerrar todas as outras
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            O backend ainda não expõe um endpoint para encerrar todas as sessões de uma vez. Encerre
            uma por vez na lista abaixo.
          </TooltipContent>
        </Tooltip>
      </div>

      <DataTable columns={columns} data={sessions ?? []} rowKey={(session) => session.id} isLoading={isLoading} />

      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Encerrar sessão"
        description="Esta sessão perderá acesso imediatamente e precisará fazer login novamente."
        confirmLabel="Encerrar"
        loading={revokeSession.isPending}
        onConfirm={handleRevokeConfirm}
      />
    </div>
  );
}
