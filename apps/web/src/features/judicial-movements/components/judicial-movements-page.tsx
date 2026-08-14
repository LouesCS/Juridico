'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import {
  CheckCheck,
  Download,
  Eye,
  History,
  Link2,
  MoreHorizontal,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { FilterBar } from '@/components/data-display/filter-bar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import { TaskFormDialog } from '@/features/tasks/components/task-form-dialog';
import { legalCasesApi } from '@/features/legal-cases/api/legal-cases.api';
import { ExtrajudicialMovementFilters } from '@/features/extrajudicial-movements/components/extrajudicial-movement-filters';
import {
  judicialMovementsApi,
  type JudicialMovement,
  type JudicialMovementFilters,
} from '../api/judicial-movements.api';

const P = {
  q: parseAsString.withDefault(''),
  leitura: parseAsString.withDefault(''),
  origem: parseAsString.withDefault(''),
  dataDe: parseAsString.withDefault(''),
  dataAte: parseAsString.withDefault(''),
  criadoDe: parseAsString.withDefault(''),
  criadoAte: parseAsString.withDefault(''),
  clientePastaId: parseAsString.withDefault(''),
  encarregadoPastaId: parseAsString.withDefault(''),
  parteContrariaPastaId: parseAsString.withDefault(''),
  pastaJuridicaId: parseAsString.withDefault(''),
  processoId: parseAsString.withDefault(''),
  tarefas: parseAsString.withDefault(''),
  timeline: parseAsString.withDefault(''),
  vinculoProcesso: parseAsString.withDefault(''),
  sort: parseAsString.withDefault('-dataMovimento'),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};
const linkClass =
  'rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const fmt = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));
const iso = (value: string, end = false) =>
  value ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`).toISOString() : undefined;

export function JudicialMovementsPage() {
  const canRead = usePermission('movement:read');
  const canUpdate = usePermission('movement:update');
  const canManage = usePermission('movement:manage');
  const canCreateTask = usePermission('task:create');
  const canFolder = [
    usePermission('legal-folder:read:all'),
    usePermission('legal-folder:read:team'),
    usePermission('legal-folder:read:assigned'),
  ].some(Boolean);
  const canCase = [
    usePermission('case:read:all'),
    usePermission('case:read:team'),
    usePermission('case:read:assigned'),
  ].some(Boolean);
  const canTask = [
    usePermission('task:read:all'),
    usePermission('task:read:team'),
    usePermission('task:read:assigned'),
  ].some(Boolean);
  const qc = useQueryClient();
  const [f, setF] = useQueryStates(P);
  const [draft, setDraft] = React.useState(f);
  const [linking, setLinking] = React.useState<JudicialMovement>();
  const params: JudicialMovementFilters = {
    q: f.q || undefined,
    leitura: (f.leitura || undefined) as JudicialMovementFilters['leitura'],
    origem: (f.origem || undefined) as JudicialMovementFilters['origem'],
    movimentoDe: iso(f.dataDe),
    movimentoAte: iso(f.dataAte, true),
    capturaDe: iso(f.criadoDe),
    capturaAte: iso(f.criadoAte, true),
    clientePastaId: f.clientePastaId || undefined,
    encarregadoPastaId: f.encarregadoPastaId || undefined,
    parteContrariaPastaId: f.parteContrariaPastaId || undefined,
    pastaJuridicaId: f.pastaJuridicaId || undefined,
    processoId: f.processoId || undefined,
    tarefas: (f.tarefas || undefined) as JudicialMovementFilters['tarefas'],
    timeline: (f.timeline || undefined) as JudicialMovementFilters['timeline'],
    vinculoProcesso: (f.vinculoProcesso || undefined) as JudicialMovementFilters['vinculoProcesso'],
    sort: f.sort,
    page: f.page,
    limit: f.limit,
  };
  const query = useQuery({
    queryKey: ['judicial-movements', params],
    queryFn: () => judicialMovementsApi.list(params),
    enabled: canRead,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['judicial-movements'] });
    void qc.invalidateQueries({ queryKey: ['judicial-movement-detail'] });
  };
  const read = useMutation({ mutationFn: judicialMovementsApi.toggleRead, onSuccess: invalidate });
  const timeline = useMutation({
    mutationFn: judicialMovementsApi.publishToTimeline,
    onSuccess: (r) => {
      toast.success(
        r.duplicada ? 'Movimentação já estava na timeline.' : 'Movimentação lançada na timeline.',
      );
      invalidate();
    },
  });
  if (!canRead) return null;
  const clearAdvanced = {
    dataDe: '',
    dataAte: '',
    criadoDe: '',
    criadoAte: '',
    clientePastaId: '',
    encarregadoPastaId: '',
    parteContrariaPastaId: '',
    pastaJuridicaId: '',
    processoId: '',
    leitura: '',
    tarefas: '',
    timeline: '',
  };
  const active = Object.entries(f).filter(
    ([key, value]) => !['sort', 'page', 'limit'].includes(key) && Boolean(value),
  ).length;
  return (
    <div>
      <PageHeader
        title={`Movimentações judiciais (${new Intl.NumberFormat('pt-BR').format(query.data?.total ?? 0)})`}
        description="Consulta geral das movimentações judiciais acessíveis."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Movimentações judiciais' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw />
              Atualizar
            </Button>
            {canManage && (
              <Button variant="outline" onClick={() => void exportCsv(params)}>
                <Download />
                Exportar
              </Button>
            )}
          </div>
        }
      />
      <FilterBar
        activeCount={active}
        onClear={() => {
          setDraft((x) => ({
            ...x,
            ...clearAdvanced,
            q: '',
            origem: '',
            vinculoProcesso: '',
            sort: '-dataMovimento',
          }));
          void setF({
            ...clearAdvanced,
            q: '',
            origem: '',
            vinculoProcesso: '',
            sort: '-dataMovimento',
            page: 1,
          });
        }}
      >
        <Input
          aria-label="Buscar movimentações"
          placeholder="Buscar por CNJ, descrição ou processo..."
          value={draft.q}
          onChange={(e) => setDraft((x) => ({ ...x, q: e.target.value }))}
          className="min-w-0 sm:max-w-sm sm:flex-1"
        />
        <Select
          value={draft.leitura || 'ALL'}
          onValueChange={(v) => setDraft((x) => ({ ...x, leitura: v === 'ALL' ? '' : v }))}
        >
          <SelectTrigger aria-label="Leitura" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="LIDA">Lidas</SelectItem>
            <SelectItem value="NAO_LIDA">Não lidas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={draft.origem || 'ALL'}
          onValueChange={(v) => setDraft((x) => ({ ...x, origem: v === 'ALL' ? '' : v }))}
        >
          <SelectTrigger aria-label="Origem" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as origens</SelectItem>
            <SelectItem value="DATAJUD">DataJud</SelectItem>
            <SelectItem value="DJEN">DJEN</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={draft.vinculoProcesso || 'ALL'}
          onValueChange={(v) => setDraft((x) => ({ ...x, vinculoProcesso: v === 'ALL' ? '' : v }))}
        >
          <SelectTrigger aria-label="Vínculo em processos" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os vínculos</SelectItem>
            <SelectItem value="COM">Com vínculo</SelectItem>
            <SelectItem value="SEM">Sem vínculo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={draft.sort} onValueChange={(v) => setDraft((x) => ({ ...x, sort: v }))}>
          <SelectTrigger aria-label="Ordenação" className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-dataMovimento">Movimentação mais recente</SelectItem>
            <SelectItem value="dataMovimento">Movimentação mais antiga</SelectItem>
            <SelectItem value="-capturadoEm">Cadastro mais recente</SelectItem>
            <SelectItem value="capturadoEm">Cadastro mais antigo</SelectItem>
          </SelectContent>
        </Select>
        <ExtrajudicialMovementFilters
          title="Filtros de movimentações judiciais"
          draft={draft}
          setDraft={(updater) =>
            setDraft((current) => ({
              ...current,
              ...(typeof updater === 'function' ? updater(current) : updater),
            }))
          }
          onApply={() => void setF({ ...draft, page: 1 })}
          onClear={() => {
            setDraft((x) => ({ ...x, ...clearAdvanced }));
            void setF({ ...clearAdvanced, page: 1 });
          }}
        />
        <Button onClick={() => void setF({ ...draft, page: 1 })}>Consultar</Button>
      </FilterBar>
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState
          title="Não foi possível carregar as movimentações."
          onRetry={() => query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyState icon={Scale} title="Nenhuma movimentação judicial encontrada." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span className="block">DATA DA MOVIMENTAÇÃO</span>
                  <span className="block text-xs font-normal">DATA DE CADASTRO</span>
                </TableHead>
                <TableHead>
                  <span className="block">DESCRIÇÃO</span>
                  <span className="block text-xs font-normal">LEITURA / ORIGEM</span>
                </TableHead>
                <TableHead>
                  <span className="block">PASTA</span>
                  <span className="block text-xs font-normal">PROCESSO</span>
                </TableHead>
                <TableHead>TAREFAS</TableHead>
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-top whitespace-nowrap">
                    <Link className={linkClass} href={`/movimentacoes-judiciais/${m.id}`}>
                      {fmt(m.dataMovimento)}
                    </Link>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {fmt(m.capturadoEm)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md align-top">
                    <p className="line-clamp-2 break-words" title={m.descricao}>
                      {m.descricao}
                    </p>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {m.lida ? 'Lida' : 'Não lida'} · Capturada ({m.provider})
                    </span>
                  </TableCell>
                  <TableCell className="min-w-52 align-top">
                    {m.pastaJuridica ? (
                      canFolder ? (
                        <Link
                          className={`${linkClass} block`}
                          href={`/pastas/${m.pastaJuridica.id}`}
                        >
                          {m.pastaJuridica.nome}
                        </Link>
                      ) : (
                        <span>{m.pastaJuridica.nome}</span>
                      )
                    ) : (
                      '--'
                    )}
                    {m.processo ? (
                      canCase ? (
                        <Link
                          className={`${linkClass} mt-1 block text-xs`}
                          href={`/processos/${m.processo.id}`}
                        >
                          {m.processo.numeroCnj ?? m.processo.titulo}
                        </Link>
                      ) : (
                        <span className="mt-1 block text-xs">
                          {m.processo.numeroCnj ?? m.processo.titulo}
                        </span>
                      )
                    ) : (
                      <span className="mt-1 block text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 align-top">
                    {m.tarefas?.length
                      ? m.tarefas.map((t) =>
                          canTask ? (
                            <Link
                              key={t.id}
                              className={`${linkClass} block truncate`}
                              href={`/tarefas/${t.id}`}
                            >
                              {t.titulo}
                            </Link>
                          ) : (
                            <span key={t.id}>{t.titulo}</span>
                          ),
                        )
                      : '--'}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <MovementActions
                      movement={m}
                      canUpdate={canUpdate}
                      canCreateTask={canCreateTask}
                      onRead={() => read.mutate(m.id)}
                      onTimeline={() => timeline.mutate(m.id)}
                      onLink={() => setLinking(m)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {query.data && query.data.total > f.limit && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Select
            value={String(f.limit)}
            onValueChange={(v) => void setF({ limit: Number(v), page: 1 })}
          >
            <SelectTrigger aria-label="Itens por página" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={f.page <= 1}
            onClick={() => void setF({ page: f.page - 1 })}
          >
            Anterior
          </Button>
          <span className="text-sm">
            Página {f.page} de {Math.ceil(query.data.total / f.limit)}
          </span>
          <Button
            variant="outline"
            disabled={f.page >= Math.ceil(query.data.total / f.limit)}
            onClick={() => void setF({ page: f.page + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}
      <ProcessLinkDialog
        movement={linking}
        onClose={() => setLinking(undefined)}
        onLinked={invalidate}
      />
    </div>
  );
}

function MovementActions({
  movement,
  canUpdate,
  canCreateTask,
  onRead,
  onTimeline,
  onLink,
}: {
  movement: JudicialMovement;
  canUpdate: boolean;
  canCreateTask: boolean;
  onRead: () => void;
  onTimeline: () => void;
  onLink: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Ações da movimentação">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canCreateTask && movement.processo ? (
          <TaskFormDialog
            mode="create"
            fixedVinculos={[
              { tipoRecurso: 'MOVIMENTACAO_JUDICIAL', recursoId: movement.id, label: 'Movimentação judicial' },
              { tipoRecurso: 'PROCESSO', recursoId: movement.processo.id, label: `Processo ${movement.processo.numeroCnj ?? movement.processo.titulo}` },
              ...(movement.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: movement.pastaJuridica.id, label: `Pasta ${movement.pastaJuridica.nome}` }] : []),
            ]}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Lançar tarefa
              </DropdownMenuItem>
            }
          />
        ) : canCreateTask ? (
          <DropdownMenuItem disabled title="A tarefa exige vínculo com um Processo.">
            Lançar tarefa
          </DropdownMenuItem>
        ) : null}
        {canUpdate && movement.pastaJuridica && (
          <DropdownMenuItem disabled={movement.naTimeline} onSelect={onTimeline}>
            <History />
            {movement.naTimeline ? 'Lançada na timeline da pasta' : 'Lançar na timeline da pasta'}
          </DropdownMenuItem>
        )}
        {canUpdate && (
          <DropdownMenuItem onSelect={onLink}>
            <Link2 />
            Vincular processo
          </DropdownMenuItem>
        )}
        {canUpdate && (
          <DropdownMenuItem onSelect={onRead}>
            <CheckCheck />
            {movement.lida ? 'Marcar como não lida' : 'Marcar como lida'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/movimentacoes-judiciais/${movement.id}`}>
            <Eye />
            Visualizar
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProcessLinkDialog({
  movement,
  onClose,
  onLinked,
}: {
  movement?: JudicialMovement;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [q, setQ] = React.useState('');
  const cases = useQuery({
    queryKey: ['judicial-movement-link-cases', q],
    queryFn: () => legalCasesApi.list({ q, limit: 20 }),
    enabled: !!movement,
  });
  const link = useMutation({
    mutationFn: (id: string) => judicialMovementsApi.linkProcess(movement!.id, id),
    onSuccess: () => {
      toast.success('Processo vinculado.');
      onLinked();
      onClose();
    },
  });
  return (
    <Dialog open={!!movement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular processo</DialogTitle>
        </DialogHeader>
        <Input
          aria-label="Pesquisar processo"
          placeholder="Buscar por CNJ ou título..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="scrollbar-fade max-h-72 space-y-1 overflow-y-auto">
          {cases.isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            cases.data?.items.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="h-auto w-full justify-start py-2 text-left"
                disabled={link.isPending}
                onClick={() => link.mutate(item.id)}
              >
                <span>
                  <span className="block font-medium">{item.numeroCnj ?? item.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{item.titulo}</span>
                </span>
              </Button>
            ))
          )}
        </div>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

async function exportCsv(query: JudicialMovementFilters) {
  const response = await judicialMovementsApi.export(query);
  const keys = Object.keys(response.items[0] ?? {});
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(
    new Blob([
      [
        keys.join(';'),
        ...response.items.map((row) => keys.map((key) => String(row[key] ?? '')).join(';')),
      ].join('\n'),
    ]),
  );
  anchor.download = 'movimentacoes-judiciais.csv';
  anchor.click();
  toast.success('Exportação concluída.');
}
