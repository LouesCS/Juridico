'use client';
import * as React from 'react';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { useRequests } from '../api/queries';
import { RequestFormDialog } from './request-form-dialog';
import { requestStatusLabel } from '../domain/request-status';
type Process = { id: string; titulo: string; numeroCnj?: string | null; tipo: string };
export function FolderRequestsTab({
  pasta,
  processos,
}: {
  pasta: { id: string; nome: string };
  processos: Process[];
}) {
  const canCreate = usePermission('request:create');
  const [page, setPage] = React.useState(1);
  const q = useRequests({ pastaJuridicaId: pasta.id, page, limit: 10, sort: '-criadoEm' });
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.isError)
    return <ErrorState title="Não foi possível carregar os Pedidos." onRetry={() => q.refetch()} />;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Pedidos ({q.data?.total ?? 0})</CardTitle>
        {canCreate && (
          <RequestFormDialog
            pasta={pasta}
            processos={processos}
            trigger={
              <Button
                size="icon"
                variant="outline"
                aria-label="Adicionar Pedido"
                title="Adicionar Pedido"
              >
                <Plus />
              </Button>
            }
          />
        )}
      </CardHeader>
      <CardContent>
        {!q.data?.items.length ? (
          <EmptyState icon={ClipboardList} title="Nenhum Pedido encontrado." />
        ) : (
          <div className="divide-y rounded-lg border">
            {q.data.items.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <Link
                    href={`/pedidos/${x.id}`}
                    className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {x.descricao}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {x.categoria} · {requestStatusLabel(x.situacao)}
                  </p>
                </div>
                {x.processo && (
                  <Link
                    href={`/processos/${x.processo.id}`}
                    className="text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {x.processo.numeroCnj ?? x.processo.titulo}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
        {q.data && q.data.total > q.data.limit && (
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page >= Math.ceil(q.data.total / q.data.limit)}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
