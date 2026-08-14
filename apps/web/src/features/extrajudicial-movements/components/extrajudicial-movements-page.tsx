'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { CheckCheck, Download, Eye, FileText, History, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AiSummaryPanel } from '@/features/ai';
import { FilterBar } from '@/components/data-display/filter-bar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/use-permission';
import { TaskFormDialog } from '@/features/tasks/components/task-form-dialog';
import { Body, ExtraMovement, extraMovementsApi } from '../api/extrajudicial-movements.api';
import { ExtrajudicialMovementFilters } from './extrajudicial-movement-filters';
import { ExtrajudicialMovementEditDialog } from './extrajudicial-movement-edit-dialog';
const P = {
  q: parseAsString.withDefault(''),
  cliente: parseAsString.withDefault(''),
  processo: parseAsString.withDefault(''),
  pasta: parseAsString.withDefault(''),
  tipo: parseAsString.withDefault(''),
  origem: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  favoritas: parseAsBoolean.withDefault(false),
  pendentes: parseAsBoolean.withDefault(false),
  concluidas: parseAsBoolean.withDefault(false),
  sort: parseAsString.withDefault('-dataMovimentacao'),
  page: parseAsInteger.withDefault(1),
  movimentacao: parseAsString.withDefault(''),
  pastaJuridicaId: parseAsString.withDefault(''),
  clientePastaId: parseAsString.withDefault(''),
  encarregadoPastaId: parseAsString.withDefault(''),
  parteContrariaPastaId: parseAsString.withDefault(''),
  processoId: parseAsString.withDefault(''),
  dataDe: parseAsString.withDefault(''),
  dataAte: parseAsString.withDefault(''),
  criadoDe: parseAsString.withDefault(''),
  criadoAte: parseAsString.withDefault(''),
  leitura: parseAsString.withDefault(''),
  tarefas: parseAsString.withDefault(''),
  timeline: parseAsString.withDefault(''),
  limit: parseAsInteger.withDefault(20),
};
const fmt = (v: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(v));
const relatedLinkClass =
  'rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
export function ExtrajudicialMovementsPage() {
  const read = usePermission('extrajudicial-movement:read'),
    update = usePermission('extrajudicial-movement:update'),
    manage = usePermission('extrajudicial-movement:manage');
  const folderAll = usePermission('legal-folder:read:all');
  const canCreateTask = usePermission('task:create');
  const canRemove = usePermission('extrajudicial-movement:delete');
  const folderTeam = usePermission('legal-folder:read:team');
  const folderAssigned = usePermission('legal-folder:read:assigned');
  const caseAll = usePermission('case:read:all');
  const caseTeam = usePermission('case:read:team');
  const caseAssigned = usePermission('case:read:assigned');
  const taskAll = usePermission('task:read:all');
  const taskTeam = usePermission('task:read:team');
  const taskAssigned = usePermission('task:read:assigned');
  const canFolder = folderAll || folderTeam || folderAssigned;
  const canCase = caseAll || caseTeam || caseAssigned;
  const canTask = taskAll || taskTeam || taskAssigned;
  const qc = useQueryClient();
  const [f, setF] = useQueryStates(P);
  const [draft, setDraft] = React.useState(f);
  const activeFilters = [
    f.q,
    f.dataDe,
    f.dataAte,
    f.criadoDe,
    f.criadoAte,
    f.clientePastaId,
    f.encarregadoPastaId,
    f.parteContrariaPastaId,
    f.pastaJuridicaId,
    f.processoId,
    f.leitura,
    f.tarefas,
    f.timeline,
  ].filter(Boolean).length;
  const [form, setForm] = React.useState<ExtraMovement | null | undefined>(undefined);
  const [removeTarget, setRemoveTarget] = React.useState<ExtraMovement | undefined>();
  const params = {
    ...f,
    movimentacao: undefined,
    dataDe: f.dataDe ? `${f.dataDe}T00:00:00.000Z` : undefined,
    dataAte: f.dataAte ? `${f.dataAte}T23:59:59.999Z` : undefined,
    criadoDe: f.criadoDe ? `${f.criadoDe}T00:00:00.000Z` : undefined,
    criadoAte: f.criadoAte ? `${f.criadoAte}T23:59:59.999Z` : undefined,
    leitura: f.leitura || undefined,
    tarefas: f.tarefas || undefined,
    timeline: f.timeline || undefined,
    clientePastaId: f.clientePastaId || undefined,
    encarregadoPastaId: f.encarregadoPastaId || undefined,
    parteContrariaPastaId: f.parteContrariaPastaId || undefined,
    pastaJuridicaId: f.pastaJuridicaId || undefined,
    processoId: f.processoId || undefined,
  };
  const q = useQuery({
    queryKey: ['extra-movements', params],
    queryFn: () => extraMovementsApi.list(params),
    enabled: read,
  });
  const mutate = useMutation({
    mutationFn: ({ id, b }: { id: string; b: Partial<Body> }) => extraMovementsApi.update(id, b),
    onSuccess: () => {
      setForm(undefined);
      toast.success('Movimentação salva.');
      void qc.invalidateQueries({ queryKey: ['extra-movements'] });
    },
  });
  const toggleRead = useMutation({
    mutationFn: extraMovementsApi.toggleRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['extra-movements'] }),
  });
  const publishTimeline = useMutation({
    mutationFn: extraMovementsApi.publishToTimeline,
    onSuccess: (result) => {
      toast.success(result.duplicada ? 'Movimentação já estava na timeline da Pasta.' : 'Movimentação lançada na timeline da Pasta.');
      void qc.invalidateQueries({ queryKey: ['extra-movements'] });
    },
  });
  const remove = useMutation({
    mutationFn: extraMovementsApi.remove,
    onSuccess: () => {
      setRemoveTarget(undefined);
      toast.success('Movimentação removida.');
      void qc.invalidateQueries({ queryKey: ['extra-movements'] });
    },
  });
  if (!read) return null;
  return (
    <div>
      <PageHeader
        title={`Movimentações extrajudiciais (${new Intl.NumberFormat('pt-BR').format(q.data?.total ?? 0)})`}
        description="Histórico de acontecimentos administrativos e extrajudiciais."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Movimentações Extrajudiciais' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => q.refetch()}>
              <RefreshCw />
              Atualizar
            </Button>
            {manage && (
              <Button variant="outline" onClick={() => void exportCsv(params)}>
                <Download />
                Exportar
              </Button>
            )}
          </div>
        }
      />
      <FilterBar
        activeCount={activeFilters}
        onClear={() =>
          void setF({
            q: '',
            cliente: '',
            processo: '',
            pasta: '',
            tipo: '',
            origem: '',
            status: '',
            favoritas: false,
            pendentes: false,
            concluidas: false,
            dataDe: '',
            dataAte: '',
            criadoDe: '',
            criadoAte: '',
            leitura: '',
            tarefas: '',
            timeline: '',
            clientePastaId: '',
            encarregadoPastaId: '',
            parteContrariaPastaId: '',
            pastaJuridicaId: '',
            processoId: '',
            sort: '-dataMovimentacao',
            page: 1,
          })
        }
      >
        <Input
          aria-label="Buscar movimentações"
          placeholder="Buscar movimentações..."
          className="min-w-0 sm:max-w-sm sm:flex-1"
          value={draft.q}
          onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
        />
        <Select
          value={draft.leitura || 'ALL'}
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, leitura: value === 'ALL' ? '' : value }))
          }
        >
          <SelectTrigger className="sm:w-44" aria-label="Leitura">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="LIDA">Lidas</SelectItem>
            <SelectItem value="NAO_LIDA">Não lidas</SelectItem>
          </SelectContent>
        </Select>
        <ExtrajudicialMovementFilters
          draft={draft}
          setDraft={(updater) =>
            setDraft((current) => ({
              ...current,
              ...(typeof updater === 'function' ? updater(current) : updater),
            }))
          }
          onApply={() => void setF({ ...draft, page: 1 })}
          onClear={() => {
            const cleared = {
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
            setDraft((current) => ({ ...current, ...cleared }));
            void setF({ ...cleared, page: 1, sort: '-dataMovimentacao' });
          }}
        />
        <Button onClick={() => void setF({ ...draft, page: 1 })}>Consultar</Button>
      </FilterBar>
      {q.isLoading ? (
        <Skeleton className="h-80" />
      ) : q.isError ? (
        <ErrorState
          title="Não foi possível carregar as movimentações."
          onRetry={() => q.refetch()}
        />
      ) : !q.data?.items.length ? (
        <EmptyState icon={FileText} title="Nenhuma movimentação extrajudicial encontrada." />
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
                  <span className="block text-xs font-normal">LEITURA</span>
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
              {q.data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-top whitespace-nowrap">
                    <Link
                      className={relatedLinkClass}
                      href={`/movimentacoes-extrajudiciais/${m.id}`}
                    >
                      {fmt(m.dataMovimentacao)}
                    </Link>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {fmt(m.criadoEm)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md align-top">
                    <p className="line-clamp-2 break-words" title={m.descricao}>
                      {m.descricao}
                    </p>
                    <Badge className="mt-1" variant="secondary">
                      {m.lida ? 'Lida' : 'Não lida'}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-52 align-top">
                    {m.pastaJuridica ? (
                      canFolder ? (
                        <Link
                          className={`${relatedLinkClass} block`}
                          href={`/pastas/${m.pastaJuridica.id}`}
                        >
                          {m.pastaJuridica.nome}
                        </Link>
                      ) : (
                        <span className="block font-medium">{m.pastaJuridica.nome}</span>
                      )
                    ) : (
                      <span>--</span>
                    )}
                    {m.processo ? (
                      canCase ? (
                        <Link
                          className={`${relatedLinkClass} mt-1 block text-xs`}
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
                      <span className="mt-1 block text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 align-top">
                    {m.tarefas.length
                      ? m.tarefas.map((task) =>
                          canTask ? (
                            <Link
                              className={`${relatedLinkClass} block truncate`}
                              key={task.id}
                              href={`/tarefas/${task.id}`}
                            >
                              {task.titulo}
                            </Link>
                          ) : (
                            <span className="block truncate" key={task.id}>
                              {task.titulo}
                            </span>
                          ),
                        )
                      : '--'}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Ações da movimentação">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canCreateTask && (
                          <TaskFormDialog mode="create" fixedVinculos={[
                            { tipoRecurso: 'MOVIMENTACAO_EXTRAJUDICIAL', recursoId: m.id, label: 'Movimentação extrajudicial' },
                            ...(m.processo ? [{ tipoRecurso: 'PROCESSO' as const, recursoId: m.processo.id, label: `Processo ${m.processo.numeroCnj ?? m.processo.titulo}` }] : []),
                            ...(m.pastaJuridica ? [{ tipoRecurso: 'PASTA_JURIDICA' as const, recursoId: m.pastaJuridica.id, label: `Pasta ${m.pastaJuridica.nome}` }] : []),
                          ]} trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()}>Lançar tarefa</DropdownMenuItem>} />
                        )}
                        {update && m.pastaJuridica && (
                          <DropdownMenuItem disabled={publishTimeline.isPending} onSelect={() => publishTimeline.mutate(m.id)}>
                            <History /> Lançar na timeline da pasta
                          </DropdownMenuItem>
                        )}
                        {update && (
                          <DropdownMenuItem disabled={toggleRead.isPending} onSelect={() => toggleRead.mutate(m.id)}>
                            <CheckCheck /> {m.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/movimentacoes-extrajudiciais/${m.id}`}><Eye /> Visualizar</Link>
                        </DropdownMenuItem>
                        {update && <DropdownMenuItem onSelect={() => setForm(m)}><Pencil /> Editar</DropdownMenuItem>}
                        {canRemove && <DropdownMenuItem className="text-destructive" onSelect={() => setRemoveTarget(m)}><Trash2 /> Remover</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {q.data && q.data.total > f.limit && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Select
            value={String(f.limit)}
            onValueChange={(value) => void setF({ limit: Number(value), page: 1 })}
          >
            <SelectTrigger className="w-36" aria-label="Itens por página">
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
            Página {f.page} de {Math.ceil(q.data.total / f.limit)}
          </span>
          <Button
            variant="outline"
            disabled={f.page >= Math.ceil(q.data.total / f.limit)}
            onClick={() => void setF({ page: f.page + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}
      <ExtrajudicialMovementEditDialog
        movement={form ?? undefined}
        onClose={() => setForm(undefined)}
        loading={mutate.isPending}
        onSave={(b) => form && mutate.mutate({ id: form.id, b })}
      />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(undefined);
        }}
        title="Remover movimentação extrajudicial?"
        description="A movimentação será removida das consultas do escritório. Os vínculos relacionados serão preservados conforme as regras do sistema."
        confirmLabel="Remover"
        confirmVariant="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (removeTarget) remove.mutate(removeTarget.id);
        }}
      />
    </div>
  );
}
export function MovementForm({
  value,
  pastaJuridicaId,
  onClose,
  onSave,
}: {
  value: ExtraMovement | null | undefined;
  pastaJuridicaId?: string;
  onClose: () => void;
  onSave: (b: Body) => void;
}) {
  const catalogs = useQuery({
    queryKey: ['extra-movement-catalogs'],
    queryFn: extraMovementsApi.catalogs,
    enabled: value !== undefined,
  });
  const [b, setB] = React.useState<Body>({
    dataMovimentacao: new Date().toISOString(),
    clienteId: value?.cliente.id,
    processoId: value?.processo?.id,
    pastaId: value?.pasta?.id,
    pastaJuridicaId: value?.pastaJuridica?.id ?? pastaJuridicaId,
    responsavelId: value?.responsavel.id ?? '',
    tipo: value?.tipo ?? 'Notificação',
    origem: value?.origem ?? 'Manual',
    status: value?.status ?? 'Pendente',
    descricao: value?.descricao ?? '',
    observacoes: value?.observacoes ?? '',
  });
  React.useEffect(() => {
    if (value !== undefined)
      setB({
        dataMovimentacao: value?.dataMovimentacao ?? new Date().toISOString(),
        clienteId: value?.cliente.id,
        processoId: value?.processo?.id,
        pastaId: value?.pasta?.id,
        pastaJuridicaId: value?.pastaJuridica?.id ?? pastaJuridicaId,
        responsavelId: value?.responsavel.id ?? '',
        tipo: value?.tipo ?? catalogs.data?.tipos[0] ?? 'Notificação',
        origem: value?.origem ?? catalogs.data?.origens[0] ?? 'Manual',
        status: value?.status ?? catalogs.data?.status[0] ?? 'Pendente',
        descricao: value?.descricao ?? '',
        observacoes: value?.observacoes ?? '',
      });
  }, [value, catalogs.data, pastaJuridicaId]);
  return (
    <Dialog open={value !== undefined} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{value ? 'Editar' : 'Nova'} movimentação</DialogTitle>
        </DialogHeader>
        {pastaJuridicaId && (
          <p className="rounded-md border bg-muted/40 p-3 text-sm">
            Vinculada à Pasta Jurídica de origem.
          </p>
        )}
        {['clienteId', 'processoId', 'pastaId', 'responsavelId', 'tipo', 'origem', 'status'].map(
          (k) => (
            <Input
              key={k}
              aria-label={k}
              placeholder={k}
              value={String(b[k as keyof Body] ?? '')}
              onChange={(e) => setB({ ...b, [k]: e.target.value })}
            />
          ),
        )}
        <textarea
          className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Descrição"
          value={b.descricao}
          onChange={(e) => setB({ ...b, descricao: e.target.value })}
        />
        <textarea
          className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Observações"
          value={b.observacoes}
          onChange={(e) => setB({ ...b, observacoes: e.target.value })}
        />
        {catalogs.data?.camposExtras.map((x) => (
          <Input key={x.id} aria-label={x.nome} placeholder={x.nome} />
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!(b.clienteId || b.processoId) || !b.responsavelId || !b.descricao}
            onClick={() => onSave(b)}
          >
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function Detail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['extra-movement', id],
    queryFn: () => extraMovementsApi.get(id!),
    enabled: !!id,
  });
  const m = q.data;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:w-[42rem]">
        <SheetTitle>Detalhe da movimentação</SheetTitle>
        {m && (
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
              <TabsTrigger value="ai">IA</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="space-y-3">
              <p className="whitespace-pre-wrap select-text">{m.descricao}</p>
              <Link href={`/clientes/${m.cliente.id}`}>{m.cliente.nome}</Link>
              {m.processo && (
                <Link className="block" href={`/processos/${m.processo.id}`}>
                  {m.processo.titulo}
                </Link>
              )}
              {m.processo && (
                <Link className="block" href={`/processos/${m.processo.id}?tab=timeline`}>
                  Timeline
                </Link>
              )}
            </TabsContent>
            <TabsContent value="attachments">
              {m.anexos?.map((a) => (
                <Link className="block" key={a.id} href={`/documentos/${a.id}`}>
                  {a.nome}
                </Link>
              ))}
              <Button asChild variant="outline">
                <Link href={`/documentos?clienteId=${m.cliente.id}`}>Abrir Document Engine</Link>
              </Button>
            </TabsContent>
            <TabsContent value="ai">
              {m.processo ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Fonte citada: movimentação {m.id}.
                  </p>
                  <AiSummaryPanel escopoTipo="PROCESSO" escopoId={m.processo.id} />
                </>
              ) : (
                <AiSummaryPanel escopoTipo="CLIENTE" escopoId={m.cliente.id} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
async function exportCsv(q: Record<string, string | number | boolean | null | undefined>) {
  const r = await extraMovementsApi.export(q);
  const keys = Object.keys(r.items[0] ?? {});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([
      [keys.join(';'), ...r.items.map((x) => keys.map((k) => String(x[k] ?? '')).join(';'))].join(
        '\n',
      ),
    ]),
  );
  a.download = 'movimentacoes-extrajudiciais.csv';
  a.click();
  toast.success('Exportação concluída.');
}
