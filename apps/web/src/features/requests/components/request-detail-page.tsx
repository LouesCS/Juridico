'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PropertyRow } from '@/components/data-display/property-row';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { usePermission } from '@/hooks/use-permission';
import { requestsApi } from '../api/requests.api';
import { requestKeys, useRequest } from '../api/queries';
import { RequestFormDialog } from './request-form-dialog';
import { requestStatusLabel } from '../domain/request-status';
import * as React from 'react';
const money = (v: string | null) =>
  v === null
    ? '--'
    : (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cls =
  'underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
export function RequestDetailPage({ id }: { id: string }) {
  const q = useRequest(id);
  const router = useRouter();
  const qc = useQueryClient();
  const canUpdate = usePermission('request:update'),
    canDelete = usePermission('request:delete');
  const [confirm, setConfirm] = React.useState(false);
  const del = useMutation({
    mutationFn: () => requestsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all('') });
      router.push('/pedidos');
    },
  });
  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data)
    return (
      <ErrorState title="Não foi possível carregar este Pedido." onRetry={() => q.refetch()} />
    );
  const x = q.data;
  return (
    <div className="request-print">
      <PageHeader title={x.descricao} description="Pedido">
        <div className="flex gap-2 print:hidden">
          {canUpdate && (
            <RequestFormDialog
              pasta={x.pastaJuridica}
              processos={x.processo ? [x.processo] : []}
              request={x}
              trigger={<Button variant="outline">Editar</Button>}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => window.print()}>
                <Printer />
                Imprimir
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm(true)}>
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyRow label="Descrição" value={x.descricao} />
            <PropertyRow label="Categoria" value={x.categoria} />
            <PropertyRow label="Situação" value={requestStatusLabel(x.situacao)} />
            <PropertyRow
              label="Data de finalização"
              value={
                x.dataFinalizacao
                  ? new Date(x.dataFinalizacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                  : '--'
              }
            />
            <PropertyRow
              label="Estimativa de êxito"
              value={x.estimativaExito ? `${x.estimativaExito}%` : '--'}
            />
            {[
              ['Valor pedido', x.valorPedidoCentavos],
              ['Valor provável', x.valorProvavelCentavos],
              ['Valor possível', x.valorPossivelCentavos],
              ['Valor remoto', x.valorRemotoCentavos],
              ['Valor final', x.valorFinalCentavos],
            ].map(([l, v]) => (
              <PropertyRow key={l} label={l as string} value={money(v as string | null)} />
            ))}
            {x.anotacoes && <PropertyRow label="Anotações" value={x.anotacoes} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vínculos</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyRow
              label="Pasta"
              value={
                <Link className={cls} href={`/pastas/${x.pastaJuridica.id}`}>
                  {x.pastaJuridica.nome}
                </Link>
              }
            />
            <PropertyRow
              label="Cliente"
              value={
                <Link className={cls} href={`/clientes/${x.pastaJuridica.clientePrincipal.id}`}>
                  {x.pastaJuridica.clientePrincipal.nome}
                </Link>
              }
            />
            <PropertyRow
              label="Processo"
              value={
                x.processo ? (
                  <Link className={cls} href={`/processos/${x.processo.id}`}>
                    {x.processo.tipo === 'JUDICIAL' && x.processo.numeroCnj
                      ? x.processo.numeroCnj
                      : x.processo.titulo}
                  </Link>
                ) : (
                  '--'
                )
              }
            />
          </CardContent>
        </Card>
      </div>
      <div className="print:hidden">
        <AuditContextSection resourceType="PEDIDO" resourceId={id} />
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Remover Pedido?"
        description="O Pedido será removido sem excluir Pasta, Processo ou recursos relacionados."
        confirmLabel="Remover"
        destructive
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}
