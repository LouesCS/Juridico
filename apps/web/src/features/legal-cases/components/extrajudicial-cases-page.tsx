'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';
import { MoreHorizontal, Scale, SlidersHorizontal } from 'lucide-react';
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
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { useOffice } from '@/features/office';
import { useLegalCases } from '../api/queries';
import {
  legalCasesApi,
  type LegalCaseStatus,
  type LegalCaseSummaryDTO,
} from '../api/legal-cases.api';
import { legalCasesKeys } from '../api/keys';
import { LEGAL_CASE_STATUS_OPTIONS, legalCaseStatusLabel } from '../domain/legal-case-status';
import {
  EMPTY_EXTRAJUDICIAL_FILTERS,
  ExtrajudicialCaseFilters,
  type ExtrajudicialAdvancedFilters,
} from './extrajudicial-case-filters';

const link =
  'min-w-0 truncate rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const header = (primary: string, ...secondary: string[]) => (
  <>
    <span className="block">{primary}</span>
    {secondary.map((x) => (
      <span key={x} className="block text-xs font-normal">
        {x}
      </span>
    ))}
  </>
);
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--';

export function ExtrajudicialCasesPage() {
  const canUpdate = usePermission('case:update'),
    canDelete = usePermission('case:delete'),
    canClient = usePermission('client:read');
  const { escritorioAtivoId } = useOffice();
  const client = useQueryClient();
  const [moreOpen, setMoreOpen] = React.useState(false),
    [deleting, setDeleting] = React.useState<LegalCaseSummaryDTO | null>(null);
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(''),
    status: parseAsString.withDefault('TODOS'),
    protocolo: parseAsString.withDefault(''),
    dataDistribuicaoDe: parseAsString.withDefault(''),
    dataDistribuicaoAte: parseAsString.withDefault(''),
    dataEncerramentoDe: parseAsString.withDefault(''),
    dataEncerramentoAte: parseAsString.withDefault(''),
    parteId: parseAsString.withDefault(''),
    pastaJuridicaId: parseAsString.withDefault(''),
    encarregadoId: parseAsString.withDefault(''),
    clienteId: parseAsString.withDefault(''),
    parteContrariaId: parseAsString.withDefault(''),
    semMovimentacoesApos: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('-ultimaAtualizacaoEm'),
    cursor: parseAsString.withDefault(''),
  });
  const appliedAdvanced = React.useMemo(
    () =>
      Object.fromEntries(
        Object.keys(EMPTY_EXTRAJUDICIAL_FILTERS).map((key) => [
          key,
          filters[key as keyof typeof filters] as string,
        ]),
      ) as ExtrajudicialAdvancedFilters,
    [filters],
  );
  const [draft, setDraft] = React.useState<ExtrajudicialAdvancedFilters>(appliedAdvanced);
  React.useEffect(() => setDraft(appliedAdvanced), [appliedAdvanced]);
  const advancedCount = Object.values(appliedAdvanced).filter(Boolean).length;
  const q = useDebouncedValue(filters.q);
  const query = useLegalCases({
    tipo: 'EXTRAJUDICIAL',
    q: q || undefined,
    status: filters.status === 'TODOS' ? undefined : (filters.status as LegalCaseStatus),
    ...Object.fromEntries(Object.entries(appliedAdvanced).filter(([, value]) => Boolean(value))),
    sort: filters.sort as '-ultimaAtualizacaoEm',
    cursor: filters.cursor || undefined,
    limit: 20,
  });
  const remove = useMutation({
    mutationFn: legalCasesApi.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') });
      setDeleting(null);
      toast.success('Processo extrajudicial removido.');
    },
    onError: () => toast.error('Não foi possível remover o Processo extrajudicial.'),
  });
  const columns = [
    {
      key: 'protocol',
      header: header('PROTOCOLO', 'INSTITUIÇÃO', 'DATA DE ENTRADA'),
      render: (x) => (
        <div className="min-w-48 space-y-1">
          <Link className={`${link} block font-medium`} href={`/processos/${x.id}`}>
            {x.numeroInterno ?? x.titulo}
          </Link>
          <span
            className="block truncate text-xs text-muted-foreground"
            title="Instituição não cadastrada"
          >
            --
          </span>
          <span className="block text-xs text-muted-foreground">{date(x.dataDistribuicao)}</span>
        </div>
      ),
    },
    {
      key: 'parties',
      header: header('REQUERENTE PRINCIPAL', 'REQUERIDO PRINCIPAL', 'DATA DE CONCLUSÃO'),
      render: (x) => (
        <div className="min-w-44 space-y-1">
          <span className="block truncate">{x.autorPrincipal?.nome ?? '--'}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {x.reuPrincipal?.nome ?? '--'}
          </span>
          <span className="block text-xs text-muted-foreground">{date(x.dataEncerramento)}</span>
        </div>
      ),
    },
    {
      key: 'folder',
      header: header('PASTA', 'ENCARREGADO DA PASTA', 'CLIENTE PRINCIPAL DA PASTA'),
      render: (x) => (
        <div className="min-w-48 space-y-1">
          {x.pastaJuridica ? (
            <Link className={`${link} block`} href={`/pastas/${x.pastaJuridica.id}`}>
              {x.pastaJuridica.nome}
            </Link>
          ) : (
            <span>--</span>
          )}
          <span className="block truncate text-xs text-muted-foreground">
            {x.pastaJuridica?.encarregado?.usuario.nome ?? '--'}
          </span>
          {x.pastaJuridica?.clientePrincipal ? (
            canClient ? (
              <Link
                className={`${link} block text-xs text-muted-foreground`}
                href={`/clientes/${x.pastaJuridica.clientePrincipal.id}`}
              >
                {x.pastaJuridica.clientePrincipal.nome}
              </Link>
            ) : (
              <span className="block truncate text-xs text-muted-foreground">
                {x.pastaJuridica.clientePrincipal.nome}
              </span>
            )
          ) : (
            <span className="block text-xs text-muted-foreground">--</span>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'SITUAÇÃO', render: (x) => legalCaseStatusLabel(x.status) },
    {
      key: 'actions',
      header: 'AÇÕES',
      className: 'text-right',
      render: (x) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${x.numeroInterno ?? x.titulo}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/processos/${x.id}`}>Visualizar</Link>
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem asChild>
                <Link href={`/processos/${x.id}?edit=1`}>Editar</Link>
              </DropdownMenuItem>
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
  ] satisfies DataTableColumn<LegalCaseSummaryDTO>[];
  if (query.isError)
    return (
      <>
        <PageHeader title="Processos extrajudiciais" />
        <ErrorState
          title="Não foi possível carregar os Processos extrajudiciais."
          onRetry={() => query.refetch()}
        />
      </>
    );
  return (
    <div>
      <PageHeader
        title={`Processos extrajudiciais (${query.data?.total ?? 0})`}
        description="Visão consolidada dos Processos criados dentro das Pastas Jurídicas."
      />
      <FilterBar>
        <Input
          aria-label="Buscar processos extrajudiciais"
          placeholder="Buscar por protocolo ou termo"
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value, cursor: '' })}
          className="sm:max-w-xs"
        />
        <Select
          value={filters.status}
          onValueChange={(status) => setFilters({ status, cursor: '' })}
        >
          <SelectTrigger aria-label="Filtrar por situação" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas as situações</SelectItem>
            {LEGAL_CASE_STATUS_OPTIONS.map((x) => (
              <SelectItem key={x.value} value={x.value}>
                {x.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setMoreOpen(true)}>
          <SlidersHorizontal />
          Mais filtros
          {advancedCount > 0 && (
            <span className="rounded-full bg-muted px-2 text-xs">{advancedCount}</span>
          )}
        </Button>
      </FilterBar>
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        rowKey={(x) => x.id}
        isLoading={query.isLoading}
        emptyState={
          <EmptyState
            icon={Scale}
            title="Nenhum Processo Extrajudicial encontrado."
            description="A criação ocorre dentro da Pasta Jurídica."
          />
        }
      />
      {query.data?.nextCursor && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setFilters({ cursor: query.data?.nextCursor ?? '' })}
          >
            Próxima
          </Button>
        </div>
      )}
      <ExtrajudicialCaseFilters
        open={moreOpen}
        onOpenChange={setMoreOpen}
        draft={draft}
        setDraft={setDraft}
        count={advancedCount}
        onCancel={() => setDraft(appliedAdvanced)}
        onClear={() => {
          setDraft(EMPTY_EXTRAJUDICIAL_FILTERS);
          setFilters({ ...EMPTY_EXTRAJUDICIAL_FILTERS, cursor: '' });
        }}
        onApply={() => setFilters({ ...draft, cursor: '' })}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remover Processo extrajudicial"
        description="O Processo será removido conforme a estratégia de exclusão existente, sem excluir a Pasta ou recursos relacionados."
        confirmLabel="Remover"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
