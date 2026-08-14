'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { ClipboardList, Download, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/data-display/filter-bar';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { useOffice } from '@/features/office';
import { useRequests, requestKeys } from '../api/queries';
import { requestsApi, type RequestDTO } from '../api/requests.api';
import { decimalToCents, formatBRLCurrency } from '../domain/money';
import { RequestsAdvancedFilters } from './requests-advanced-filters';
import { RequestFormDialog } from './request-form-dialog';
import { REQUEST_STATUS_OPTIONS, requestStatusLabel } from '../domain/request-status';

const link =
  'rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const advancedKeys = [
  'categoria',
  'pastaJuridicaId',
  'dataFinalizacaoDe',
  'dataFinalizacaoAte',
  'estimativaMin',
  'estimativaMax',
  'valorPedidoMin',
  'valorPedidoMax',
  'valorProvavelMin',
  'valorProvavelMax',
  'valorPossivelMin',
  'valorPossivelMax',
  'valorRemotoMin',
  'valorRemotoMax',
  'valorFinalMin',
  'valorFinalMax',
] as const;
const stackedHeader = (primary: string, ...secondary: string[]) => (
  <>
    <span className="block">{primary}</span>
    {secondary.map((label) => (
      <span key={label} className="block text-xs font-normal">
        {label}
      </span>
    ))}
  </>
);
export function RequestsPage() {
  const canExport = usePermission('request:export'),
    canUpdate = usePermission('request:update'),
    canDelete = usePermission('request:delete');
  const { escritorioAtivoId } = useOffice();
  const client = useQueryClient();
  const [editing, setEditing] = React.useState<RequestDTO | null>(null),
    [deleting, setDeleting] = React.useState<RequestDTO | null>(null);
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(''),
    situacao: parseAsString.withDefault('ALL'),
    categoria: parseAsString.withDefault(''),
    pastaJuridicaId: parseAsString.withDefault(''),
    dataFinalizacaoDe: parseAsString.withDefault(''),
    dataFinalizacaoAte: parseAsString.withDefault(''),
    estimativaMin: parseAsString.withDefault(''),
    estimativaMax: parseAsString.withDefault(''),
    valorPedidoMin: parseAsString.withDefault(''),
    valorPedidoMax: parseAsString.withDefault(''),
    valorProvavelMin: parseAsString.withDefault(''),
    valorProvavelMax: parseAsString.withDefault(''),
    valorPossivelMin: parseAsString.withDefault(''),
    valorPossivelMax: parseAsString.withDefault(''),
    valorRemotoMin: parseAsString.withDefault(''),
    valorRemotoMax: parseAsString.withDefault(''),
    valorFinalMin: parseAsString.withDefault(''),
    valorFinalMax: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('-criadoEm'),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });
  const applied = React.useMemo(
    () => Object.fromEntries(advancedKeys.map((k) => [k, String(filters[k] ?? '')])),
    [filters],
  );
  const [draft, setDraft] = React.useState<Record<string, string>>(applied);
  React.useEffect(() => setDraft(applied), [applied]);
  const q = useDebouncedValue(filters.q);
  const range = (k: (typeof advancedKeys)[number]) =>
    decimalToCents(String(filters[k])) ?? undefined;
  const params = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== 'ALL')),
    q: q || undefined,
    situacao: filters.situacao === 'ALL' ? undefined : filters.situacao,
    page: filters.page,
    limit: filters.limit,
    valorPedidoMin: range('valorPedidoMin'),
    valorPedidoMax: range('valorPedidoMax'),
    valorProvavelMin: range('valorProvavelMin'),
    valorProvavelMax: range('valorProvavelMax'),
    valorPossivelMin: range('valorPossivelMin'),
    valorPossivelMax: range('valorPossivelMax'),
    valorRemotoMin: range('valorRemotoMin'),
    valorRemotoMax: range('valorRemotoMax'),
    valorFinalMin: range('valorFinalMin'),
    valorFinalMax: range('valorFinalMax'),
  };
  const query = useRequests(params);
  const remove = useMutation({
    mutationFn: requestsApi.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: requestKeys.all(escritorioAtivoId ?? '') });
      setDeleting(null);
      toast.success('Pedido removido');
    },
    onError: () => toast.error('Não foi possível remover o Pedido.'),
  });
  const columns = [
    {
      key: 'descricao',
      header: stackedHeader('DESCRIÇÃO', 'CATEGORIA'),
      render: (x) => (
        <div className="space-y-1">
          <Link className={`${link} font-medium`} href={`/pedidos/${x.id}`}>
            {x.descricao}
          </Link>
          <div className="text-xs text-muted-foreground">{x.categoria}</div>
        </div>
      ),
    },
    {
      key: 'vinculos',
      header: stackedHeader('PASTA', 'PROCESSO'),
      render: (x) => (
        <div className="space-y-1">
          <Link className={`${link} block text-sm`} href={`/pastas/${x.pastaJuridica.id}`}>
            {x.pastaJuridica.nome}
          </Link>
          {x.processo ? (
            <Link
              className={`${link} block text-xs text-muted-foreground`}
              href={`/processos/${x.processo.id}`}
            >
              {x.processo.tipo === 'JUDICIAL' && x.processo.numeroCnj
                ? `CNJ ${x.processo.numeroCnj}`
                : x.processo.titulo}
            </Link>
          ) : (
            <span className="block text-xs text-muted-foreground">--</span>
          )}
        </div>
      ),
    },
    {
      key: 'valor',
      header: stackedHeader('VALOR PEDIDO', 'ESTIMATIVA DE ÊXITO'),
      render: (x) => (
        <div className="space-y-1">
          <div>{formatBRLCurrency(x.valorPedidoCentavos)}</div>
          <div className="text-xs text-muted-foreground">
            {x.estimativaExito ? `${x.estimativaExito}%` : '--'}
          </div>
        </div>
      ),
    },
    {
      key: 'cenarios',
      header: stackedHeader('VALOR PROVÁVEL', 'VALOR POSSÍVEL', 'VALOR REMOTO'),
      render: (x) => (
        <div className="space-y-1 text-sm">
          <div>{formatBRLCurrency(x.valorProvavelCentavos)}</div>
          <div>{formatBRLCurrency(x.valorPossivelCentavos)}</div>
          <div>{formatBRLCurrency(x.valorRemotoCentavos)}</div>
        </div>
      ),
    },
    {
      key: 'resultado',
      header: stackedHeader('SITUAÇÃO', 'DATA DE FINALIZAÇÃO', 'VALOR FINAL'),
      render: (x) => (
        <div className="space-y-1">
          <div>{requestStatusLabel(x.situacao)}</div>
          <div className="text-xs text-muted-foreground">
            {x.dataFinalizacao
              ? new Date(x.dataFinalizacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
              : '--'}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatBRLCurrency(x.valorFinalCentavos)}
          </div>
        </div>
      ),
    },
    {
      key: 'acoes',
      header: 'AÇÕES',
      className: 'text-right',
      render: (x) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Ações de ${x.descricao}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/pedidos/${x.id}`}>Visualizar</Link>
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem onSelect={() => setEditing(x)}>Editar</DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(x)}>
                Remover
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ] satisfies DataTableColumn<RequestDTO>[];
  if (query.isError)
    return (
      <>
        <PageHeader title="Pedidos" />
        <ErrorState title="Não foi possível carregar os Pedidos." onRetry={() => query.refetch()} />
      </>
    );
  const clear = () => {
    const empty = Object.fromEntries(advancedKeys.map((k) => [k, '']));
    setDraft(empty);
    setFilters({ ...empty, page: 1 });
  };
  return (
    <div>
      <PageHeader
        title={`Pedidos (${query.data?.total ?? 0})`}
        description="Pedidos são cadastrados dentro da Pasta Jurídica."
        actions={
          canExport ? (
            <Button
              variant="outline"
              onClick={async () => {
                const data = await requestsApi.export({ ...params, page: 1 });
                const rows = data.items,
                  csv = [
                    Object.keys(rows[0] ?? {}).join(';'),
                    ...rows.map((row) =>
                      Object.values(row)
                        .map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`)
                        .join(';'),
                    ),
                  ].join('\n');
                const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })),
                  a = document.createElement('a');
                a.href = url;
                a.download = 'pedidos.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download />
              Exportar
            </Button>
          ) : undefined
        }
      />
      <FilterBar>
        <Input
          aria-label="Buscar Pedidos"
          placeholder="Buscar por descrição"
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
          className="sm:max-w-xs"
        />
        <Select
          value={filters.situacao}
          onValueChange={(situacao) => setFilters({ situacao, page: 1 })}
        >
          <SelectTrigger aria-label="Filtrar por situação" className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as situações</SelectItem>
            {REQUEST_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RequestsAdvancedFilters
          draft={draft}
          setDraft={setDraft}
          count={advancedKeys.filter((k) => Boolean(filters[k])).length}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={clear}
        />
      </FilterBar>
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        rowKey={(x) => x.id}
        isLoading={query.isLoading}
        emptyState={
          <EmptyState
            icon={ClipboardList}
            title="Nenhum Pedido encontrado."
            description="Pedidos são cadastrados dentro da Pasta Jurídica."
          />
        }
      />
      {query.data && query.data.total > query.data.limit && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={filters.page === 1}
            onClick={() => setFilters({ page: filters.page - 1 })}
          >
            Anterior
          </Button>
          <span className="self-center text-sm">Página {filters.page}</span>
          <Button
            variant="outline"
            disabled={filters.page >= Math.ceil(query.data.total / query.data.limit)}
            onClick={() => setFilters({ page: filters.page + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}
      {editing && (
        <RequestFormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          pasta={editing.pastaJuridica}
          processos={editing.processo ? [editing.processo] : []}
          request={editing}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remover Pedido"
        description="O Pedido será removido da visualização, preservando o soft delete do módulo."
        confirmLabel="Remover"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
