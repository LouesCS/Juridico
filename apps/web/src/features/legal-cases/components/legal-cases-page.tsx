'use client';

import * as React from 'react';
import Link from 'next/link';
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';
import { Lock, MoreHorizontal, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { toast } from 'sonner';
import type {
  LegalCasePriority,
  LegalCaseStatus,
  LegalCaseSummaryDTO,
} from '../api/legal-cases.api';
import { useLegalCases } from '../api/queries';
import { useDeleteLegalCase } from '../api/mutations';
import { formatCnj } from '@/lib/validators/cnj';
import { ExtrajudicialCasesPage } from './extrajudicial-cases-page';

const INSTANCIA_LABEL: Record<string, string> = {
  PRIMEIRA: '1ª instância',
  SEGUNDA: '2ª instância',
  SUPERIOR: 'Instância superior',
};
const VINCULACAO_LABEL: Record<string, string> = {
  ATIVO: 'Ativo',
  PASSIVO: 'Passivo',
  TERCEIRO: 'Terceiro',
};
function GridLine({
  href,
  allowed,
  strong,
  children,
}: {
  href?: string;
  allowed?: boolean;
  strong?: boolean;
  children: React.ReactNode;
}) {
  const text = children ?? '--';
  const className = `block truncate text-xs ${strong ? 'font-medium text-foreground' : 'text-muted-foreground'}`;
  if (href && allowed && children) {
    return (
      <Link
        href={href}
        className={`${className} rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
      >
        {text}
      </Link>
    );
  }
  return <span className={className}>{text || '--'}</span>;
}

export function LegalCasesPage({ tipo }: { tipo?: 'JUDICIAL' | 'EXTRAJUDICIAL' }) {
  return tipo === 'EXTRAJUDICIAL' ? (
    <ExtrajudicialCasesPage />
  ) : (
    <JudicialLegalCasesPage genericFilters={tipo === undefined} />
  );
}

function RowActions({ legalCase }: { legalCase: LegalCaseSummaryDTO }) {
  const canUpdate = usePermission('case:update');
  const canDelete = usePermission('case:delete');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const deleteCase = useDeleteLegalCase(legalCase.id);
  if (!canUpdate && !canDelete) {
    return (
      <Link
        href={`/processos/${legalCase.id}`}
        className="text-sm underline-offset-4 hover:underline"
      >
        Visualizar
      </Link>
    );
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações para ${legalCase.titulo}`}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/processos/${legalCase.id}`}>Visualizar</Link>
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem asChild>
              <Link href={`/processos/${legalCase.id}?edit=1`}>Editar</Link>
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              Remover
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover processo"
        description={`"${legalCase.titulo}" será excluído. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        loading={deleteCase.isPending}
        onConfirm={() =>
          deleteCase.mutate(undefined, {
            onSuccess: () => {
              toast.success('Processo removido.');
              setConfirmOpen(false);
            },
            onError: () => toast.error('Não foi possível remover este processo.'),
          })
        }
      />
    </>
  );
}

function JudicialLegalCasesPage({ genericFilters }: { genericFilters: boolean }) {
  const tipo = 'JUDICIAL' as const;
  const canClient = usePermission('client:read');
  const canMember = usePermission('member:read');
  const canFolderAll = usePermission('legal-folder:read:all');
  const canFolderTeam = usePermission('legal-folder:read:team');
  const canFolderAssigned = usePermission('legal-folder:read:assigned');
  const canFolder = canFolderAll || canFolderTeam || canFolderAssigned;
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<LegalCaseStatus | 'TODOS'>('TODOS');
  const [priorityFilter, setPriorityFilter] = React.useState<LegalCasePriority | 'TODOS'>('TODOS');
  const [meusApenas, setMeusApenas] = React.useState(false);
  const [genericSort, setGenericSort] = React.useState<
    '-ultimaAtualizacaoEm' | 'dataDistribuicao' | '-dataDistribuicao'
  >('-ultimaAtualizacaoEm');
  const debouncedSearch = useDebouncedValue(search);

  const [filters, setFilters] = useQueryStates({
    dataDistribuicaoDe: parseAsString.withDefault(''),
    dataDistribuicaoAte: parseAsString.withDefault(''),
    sort: parseAsStringEnum(['-dataDistribuicao', 'dataDistribuicao'] as const).withDefault(
      '-dataDistribuicao',
    ),
    cursor: parseAsString.withDefault(''),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    priority: parseAsString.withDefault(''),
    mine: parseAsString.withDefault(''),
    meusApenas: parseAsString.withDefault(''),
  });
  React.useEffect(() => {
    if (
      !genericFilters &&
      (filters.search || filters.status || filters.priority || filters.mine || filters.meusApenas)
    ) {
      void setFilters({
        search: null,
        status: null,
        priority: null,
        mine: null,
        meusApenas: null,
      });
    }
  }, [
    filters.mine,
    filters.meusApenas,
    filters.priority,
    filters.search,
    filters.status,
    genericFilters,
    setFilters,
  ]);
  // Filtro de Data de entrada — server-side, com aplicação explícita
  // (Consultar/Limpar) em vez de disparar uma consulta a cada tecla, já
  // que datas costumam ser digitadas incrementalmente.
  const [dateDraft, setDateDraft] = React.useState({
    de: filters.dataDistribuicaoDe,
    ate: filters.dataDistribuicaoAte,
  });
  const [dateError, setDateError] = React.useState('');
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useLegalCases({
    tipo,
    q: genericFilters && debouncedSearch ? debouncedSearch : undefined,
    status: genericFilters && statusFilter !== 'TODOS' ? statusFilter : undefined,
    prioridade: genericFilters && priorityFilter !== 'TODOS' ? priorityFilter : undefined,
    meusApenas: genericFilters && meusApenas ? true : undefined,
    dataDistribuicaoDe: filters.dataDistribuicaoDe || undefined,
    dataDistribuicaoAte: filters.dataDistribuicaoAte || undefined,
    sort: genericFilters ? genericSort : filters.sort,
    cursor: filters.cursor || undefined,
    limit: 20,
  });

  function applyDateFilter() {
    if (dateDraft.de && dateDraft.ate && dateDraft.de > dateDraft.ate) {
      setDateError('A data mínima não pode ser posterior à data máxima.');
      return;
    }
    setDateError('');
    setCursorHistory([]);
    void setFilters({
      dataDistribuicaoDe: dateDraft.de || null,
      dataDistribuicaoAte: dateDraft.ate || null,
      cursor: null,
    });
  }
  function clearDateFilter() {
    setDateDraft({ de: '', ate: '' });
    setDateError('');
    setCursorHistory([]);
    void setFilters({ dataDistribuicaoDe: null, dataDistribuicaoAte: null, cursor: null });
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Processos judiciais" />
        <ErrorState title="Não foi possível carregar os processos." onRetry={() => refetch()} />
      </div>
    );
  }

  const hasActiveFilters =
    (genericFilters &&
      (!!search || statusFilter !== 'TODOS' || priorityFilter !== 'TODOS' || meusApenas)) ||
    !!filters.dataDistribuicaoDe ||
    !!filters.dataDistribuicaoAte;

  const columns = [
    {
      key: 'processo',
      header: 'Processo',
      render: (legalCase) => (
        <div className="min-w-0 space-y-0.5">
          <span className="flex items-center gap-1.5">
            <GridLine href={`/processos/${legalCase.id}`} allowed strong>
              {legalCase.numeroCnj ? formatCnj(legalCase.numeroCnj) : ''}
            </GridLine>
            {legalCase.segredoJustica && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-label="Segredo de justiça"
                  />
                </TooltipTrigger>
                <TooltipContent>Segredo de justiça</TooltipContent>
              </Tooltip>
            )}
          </span>
          <GridLine>
            {[
              legalCase.tribunal,
              legalCase.instancia && INSTANCIA_LABEL[legalCase.instancia],
              legalCase.vara,
            ]
              .filter(Boolean)
              .join(' · ')}
          </GridLine>
          <GridLine>
            {VINCULACAO_LABEL[legalCase.poloCliente as string] ?? legalCase.poloCliente}
          </GridLine>
          <GridLine>{legalCase.area}</GridLine>
        </div>
      ),
    },
    {
      key: 'autor',
      header: 'Autor',
      render: (legalCase) => (
        <div className="min-w-0 space-y-0.5">
          <GridLine strong>
            {legalCase.dataDistribuicao
              ? new Date(legalCase.dataDistribuicao).toLocaleDateString('pt-BR')
              : ''}
          </GridLine>
          <GridLine href={`/clientes/${legalCase.autorPrincipal?.clienteId}`} allowed={canClient}>
            {legalCase.autorPrincipal?.nome}
          </GridLine>
          <GridLine
            href={`/clientes/${legalCase.advogadoPrincipalAutor?.clienteId}`}
            allowed={canClient}
          >
            {legalCase.advogadoPrincipalAutor?.nome}
          </GridLine>
          <StatusBadge status={legalCase.status} />
        </div>
      ),
    },
    {
      key: 'reu',
      header: 'Réu',
      render: (legalCase) => (
        <div className="min-w-0 space-y-0.5">
          <GridLine strong>
            {legalCase.dataEncerramento
              ? new Date(legalCase.dataEncerramento).toLocaleDateString('pt-BR')
              : ''}
          </GridLine>
          <GridLine href={`/clientes/${legalCase.reuPrincipal?.clienteId}`} allowed={canClient}>
            {legalCase.reuPrincipal?.nome}
          </GridLine>
          <GridLine
            href={`/clientes/${legalCase.advogadoPrincipalReu?.clienteId}`}
            allowed={canClient}
          >
            {legalCase.advogadoPrincipalReu?.nome}
          </GridLine>
          <GridLine>{legalCase.tipoAcao}</GridLine>
        </div>
      ),
    },
    {
      key: 'pasta',
      header: 'Pasta',
      render: (legalCase) => (
        <div className="min-w-0 space-y-0.5">
          <GridLine href={`/pastas/${legalCase.pastaJuridica?.id}`} allowed={canFolder} strong>
            {legalCase.pastaJuridica?.nome}
          </GridLine>
          <GridLine
            href={`/colaboradores/${legalCase.pastaJuridica?.encarregado?.id}`}
            allowed={canMember}
          >
            {legalCase.pastaJuridica?.encarregado?.usuario.nome}
          </GridLine>
          <GridLine
            href={`/clientes/${legalCase.pastaJuridica?.clientePrincipal?.id}`}
            allowed={canClient}
          >
            {legalCase.pastaJuridica?.clientePrincipal?.nome}
          </GridLine>
          <GridLine
            href={`/clientes/${legalCase.pastaJuridica?.parteContrariaPrincipal?.id}`}
            allowed={canClient}
          >
            {legalCase.pastaJuridica?.parteContrariaPrincipal?.nome}
          </GridLine>
        </div>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (legalCase) => <RowActions legalCase={legalCase} />,
    },
  ] satisfies DataTableColumn<LegalCaseSummaryDTO>[];

  return (
    <div>
      <PageHeader
        title={`Processos judiciais (${data?.total ?? 0})`}
        description="A criação ocorre dentro da Pasta Jurídica."
      />

      {genericFilters && (
        <FilterBar>
          <Input
            placeholder="Buscar por título ou número CNJ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar processos"
            className="sm:max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger className="sm:w-40" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="SUSPENSO">Suspenso</SelectItem>
              <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
              <SelectItem value="ENCERRADO">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as typeof priorityFilter)}
          >
            <SelectTrigger className="sm:w-40" aria-label="Filtrar por prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas as prioridades</SelectItem>
              <SelectItem value="CRITICA">Crítica</SelectItem>
              <SelectItem value="ALTA">Alta</SelectItem>
              <SelectItem value="MEDIA">Média</SelectItem>
              <SelectItem value="BAIXA">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={meusApenas ? 'MEUS' : 'TODOS'}
            onValueChange={(value) => setMeusApenas(value === 'MEUS')}
          >
            <SelectTrigger className="sm:w-44" aria-label="Filtrar por responsável">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os processos</SelectItem>
              <SelectItem value="MEUS">Apenas meus processos</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={genericSort}
            onValueChange={(value) => setGenericSort(value as typeof genericSort)}
          >
            <SelectTrigger className="sm:w-56" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-ultimaAtualizacaoEm">Última movimentação</SelectItem>
              <SelectItem value="-dataDistribuicao">Data de entrada decrescente</SelectItem>
              <SelectItem value="dataDistribuicao">Data de entrada crescente</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border p-3 lg:grid-cols-[12.5rem_12.5rem_auto_auto_minmax(0,1fr)] lg:items-end">
        <div className="col-span-2 space-y-1.5 sm:col-span-1 lg:w-[12.5rem]">
          <Label htmlFor="data-entrada-de" className="lg:whitespace-nowrap">
            Data de entrada — Mín.
          </Label>
          <Input
            id="data-entrada-de"
            type="date"
            value={dateDraft.de}
            onChange={(e) => setDateDraft((v) => ({ ...v, de: e.target.value }))}
            className="w-full"
          />
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1 lg:w-[12.5rem]">
          <Label htmlFor="data-entrada-ate" className="lg:whitespace-nowrap">
            Data de entrada — Máx.
          </Label>
          <Input
            id="data-entrada-ate"
            type="date"
            value={dateDraft.ate}
            onChange={(e) => setDateDraft((v) => ({ ...v, ate: e.target.value }))}
            className="w-full"
          />
        </div>
        <Button type="button" onClick={applyDateFilter}>
          Consultar
        </Button>
        <Button type="button" variant="outline" onClick={clearDateFilter}>
          Limpar
        </Button>
        {!genericFilters && (
          <Select
            value={filters.sort}
            onValueChange={(sort) => {
              setCursorHistory([]);
              void setFilters({ sort: sort as typeof filters.sort, cursor: null });
            }}
          >
            <SelectTrigger
              className="col-span-2 w-full lg:col-span-1 lg:ml-auto lg:max-w-64"
              aria-label="Ordenar por"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-dataDistribuicao">Data de entrada decrescente</SelectItem>
              <SelectItem value="dataDistribuicao">Data de entrada crescente</SelectItem>
            </SelectContent>
          </Select>
        )}
        {dateError && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">
            {dateError}
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(legalCase) => legalCase.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Scale}
            title={
              hasActiveFilters
                ? 'Nenhum processo encontrado'
                : 'Nenhum Processo Judicial encontrado.'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Crie uma Pasta Jurídica para cadastrar o primeiro processo.'
            }
          />
        }
      />

      {(cursorHistory.length > 0 || data?.nextCursor) && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cursorHistory.length === 0}
            onClick={() => {
              const history = [...cursorHistory];
              const previousCursor = history.pop();
              setCursorHistory(history);
              void setFilters({ cursor: previousCursor || null });
            }}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {cursorHistory.length + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.nextCursor}
            onClick={() => {
              setCursorHistory((history) => [...history, filters.cursor]);
              void setFilters({ cursor: data?.nextCursor ?? null });
            }}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
