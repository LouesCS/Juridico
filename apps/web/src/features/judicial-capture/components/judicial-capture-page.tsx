'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';
import { MoreHorizontal, RefreshCw, Radar, History } from 'lucide-react';
import { toast } from 'sonner';
import { FilterBar } from '@/components/data-display/filter-bar';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { clientsApi } from '@/features/clients/api/clients.api';
import { isValidCnj } from '@/lib/validators/cnj';
import {
  CaptureConfiguration,
  CaptureStatus,
  judicialCaptureApi,
} from '../api/judicial-capture.api';
import {
  CaptureFilters,
  captureStatusLabels,
  folderOptionsFrom,
  type CaptureFilterValues,
} from './capture-filters';

const FILTERS = {
  q: parseAsString.withDefault(''),
  pasta: parseAsString.withDefault(''),
  processo: parseAsString.withDefault(''),
  cliente: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  ativa: parseAsStringEnum(['', 'true', 'false']).withDefault(''),
  cadastroDe: parseAsString.withDefault(''),
  cadastroAte: parseAsString.withDefault(''),
  atualizadoDe: parseAsString.withDefault(''),
  atualizadoAte: parseAsString.withDefault(''),
  syncDe: parseAsString.withDefault(''),
  syncAte: parseAsString.withDefault(''),
  sort: parseAsString.withDefault('-criadoEm'),
};
const labels = captureStatusLabels;
const CLEAN_FILTERS: CaptureFilterValues = {
  q: '',
  pasta: '',
  processo: '',
  cliente: '',
  status: '',
  ativa: '',
  cadastroDe: '',
  cadastroAte: '',
  atualizadoDe: '',
  atualizadoAte: '',
  syncDe: '',
  syncAte: '',
  sort: '-criadoEm',
};
const variants: Record<CaptureStatus, 'success' | 'secondary' | 'outline' | 'destructive'> = {
  ATIVA: 'success',
  PAUSADA: 'secondary',
  SINCRONIZANDO: 'outline',
  ERRO: 'destructive',
};
const dt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '--';
const dateOnly = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));

export function JudicialCapturePage() {
  const searchParams = useSearchParams();
  const allowed = usePermission('capture:read');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useQueryStates(FILTERS);
  const [draft, setDraft] = React.useState<CaptureFilterValues>(filters);
  const [form, setForm] = React.useState<CaptureConfiguration | null | undefined>(undefined);
  const [details, setDetails] = React.useState<CaptureConfiguration | null>(null);
  const [remove, setRemove] = React.useState<CaptureConfiguration | null>(null);
  const contextualCreationOpened = React.useRef(false);
  const contextualParams = React.useMemo(
    () =>
      searchParams ??
      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined),
    [searchParams],
  );
  const contextualClientId = contextualParams?.get('clienteId') ?? undefined;
  React.useEffect(() => {
    if (
      !contextualCreationOpened.current &&
      contextualParams?.get('nova') === '1' &&
      contextualClientId
    ) {
      contextualCreationOpened.current = true;
      setForm(null);
    }
  }, [contextualClientId, contextualParams]);
  const query = useQuery({
    queryKey: ['capture-configurations', filters],
    queryFn: () =>
      judicialCaptureApi.list({
        q: filters.q || undefined,
        pastaJuridicaId: filters.pasta || undefined,
        processo: filters.processo || undefined,
        cliente: filters.cliente || undefined,
        status: filters.status || undefined,
        ativa: filters.ativa ? filters.ativa === 'true' : undefined,
        criadoDe: filters.cadastroDe
          ? new Date(`${filters.cadastroDe}T00:00:00`).toISOString()
          : undefined,
        criadoAte: filters.cadastroAte
          ? new Date(`${filters.cadastroAte}T23:59:59`).toISOString()
          : undefined,
        atualizadoDe: filters.atualizadoDe
          ? new Date(`${filters.atualizadoDe}T00:00:00`).toISOString()
          : undefined,
        atualizadoAte: filters.atualizadoAte
          ? new Date(`${filters.atualizadoAte}T23:59:59`).toISOString()
          : undefined,
        ultimaSincronizacaoDe: filters.syncDe
          ? new Date(`${filters.syncDe}T00:00:00`).toISOString()
          : undefined,
        ultimaSincronizacaoAte: filters.syncAte
          ? new Date(`${filters.syncAte}T23:59:59`).toISOString()
          : undefined,
        sort: filters.sort,
      }),
    enabled: allowed,
  });
  const folderSource = useQuery({
    queryKey: ['capture-configurations', 'folder-options'],
    queryFn: () => judicialCaptureApi.list({ limit: 100, sort: '-criadoEm' }),
    enabled: allowed,
    staleTime: 60_000,
  });
  const sync = useMutation({
    mutationFn: judicialCaptureApi.sync,
    onSuccess: (r) => {
      toast.success(
        r.novidades
          ? `Sincronização concluída: ${r.novidades} novidade(s).`
          : 'Sincronização concluída sem novidades.',
      );
      void queryClient.invalidateQueries({ queryKey: ['capture-configurations'] });
    },
    onError: () => toast.error('Não foi possível sincronizar com a fonte judicial.'),
  });
  const deletion = useMutation({
    mutationFn: judicialCaptureApi.remove,
    onSuccess: () => {
      toast.success('Configuração excluída. Processos e dados jurídicos foram preservados.');
      setRemove(null);
      void queryClient.invalidateQueries({ queryKey: ['capture-configurations'] });
    },
    onError: () => toast.error('Não foi possível excluir a configuração.'),
  });
  if (!allowed) return null;
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== 'sort' && Boolean(value),
  ).length;
  const advancedKeys: Array<keyof CaptureFilterValues> = [
    'processo',
    'cliente',
    'ativa',
    'cadastroDe',
    'cadastroAte',
    'atualizadoDe',
    'atualizadoAte',
    'syncDe',
    'syncAte',
  ];
  const advancedCount = advancedKeys.filter((key) => Boolean(filters[key])).length;
  return (
    <div>
      <PageHeader
        title="Configurações de Captura"
        description="Configure os processos que devem ser acompanhados automaticamente."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Configurações de Captura' }]}
        actions={
          <>
            <Badge variant="secondary">{query.data?.total ?? 0} configurações</Badge>
            <Button variant="outline" onClick={() => query.refetch()} loading={query.isFetching}>
              <RefreshCw className="size-4" />
              Atualizar
            </Button>
          </>
        }
      />
      <FilterBar
        activeCount={active}
        onClear={() => {
          setDraft(CLEAN_FILTERS);
          void setFilters(CLEAN_FILTERS);
        }}
      >
        <CaptureFilters
          draft={draft}
          setDraft={setDraft}
          folders={folderOptionsFrom(folderSource.data?.items ?? query.data?.items ?? [])}
          advancedCount={advancedCount}
          onApply={(values) => void setFilters(values)}
        />
      </FilterBar>
      {query.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : query.isError ? (
        <ErrorState
          title="Não foi possível carregar as configurações."
          onRetry={() => query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyState
          icon={Radar}
          title="Nenhum processo configurado para captura."
          description="Adicione um número CNJ para começar a acompanhar novas informações processuais."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNJ</TableHead>
                <TableHead>Pasta</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data de cadastro</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Última sincronização</TableHead>
                <TableHead>Novidades</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.numeroCnj}</TableCell>
                  <TableCell>
                    {item.pasta ? (
                      <Link
                        className="font-medium hover:underline"
                        href={`/pastas/${item.pasta.id}`}
                      >
                        {item.pasta.nome}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.processo ? (
                      <Link className="hover:underline" href={`/processos/${item.processo.id}`}>
                        {item.processo.titulo}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Vincular posteriormente</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.processo ? (
                      <Link
                        className="hover:underline"
                        href={`/clientes/${item.processo.cliente.id}`}
                      >
                        {item.processo.cliente.nome}
                      </Link>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{dateOnly(item.criadoEm)}</TableCell>
                  <TableCell>
                    <Badge variant={variants[item.status]}>{labels[item.status]}</Badge>
                  </TableCell>
                  <TableCell>{dt(item.ultimaSincronizacaoEm)}</TableCell>
                  <TableCell>
                    <Badge variant={item.novidadesUltimaCaptura ? 'success' : 'secondary'}>
                      {item.novidadesUltimaCaptura}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Actions
                      item={item}
                      onDetails={setDetails}
                      onEdit={setForm}
                      onSync={(id) => sync.mutate(id)}
                      syncing={sync.isPending}
                      onRemove={setRemove}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {form !== undefined && (
        <CaptureDialog
          item={form}
          contextualClientId={form === null ? contextualClientId : undefined}
          onClose={() => setForm(undefined)}
        />
      )}{' '}
      {details && <HistoryDialog item={details} onClose={() => setDetails(null)} />}{' '}
      {remove && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setRemove(null)}
          title="Excluir configuração"
          description="Somente o acompanhamento será excluído. Processo, cliente e informações já capturadas serão preservados."
          confirmLabel="Excluir configuração"
          loading={deletion.isPending}
          onConfirm={() => deletion.mutate(remove.id)}
        />
      )}
    </div>
  );
}

function Actions({
  item,
  onDetails,
  onEdit,
  onSync,
  syncing,
  onRemove,
}: {
  item: CaptureConfiguration;
  onDetails: (v: CaptureConfiguration) => void;
  onEdit: (v: CaptureConfiguration) => void;
  onSync: (id: string) => void;
  syncing: boolean;
  onRemove: (v: CaptureConfiguration) => void;
}) {
  const canUpdate = usePermission('capture:update'),
    canSync = usePermission('capture:sync'),
    canDelete = usePermission('capture:delete');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ações de ${item.numeroCnj}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onDetails(item)}>Visualizar histórico</DropdownMenuItem>
        {canUpdate && <DropdownMenuItem onClick={() => onEdit(item)}>Editar</DropdownMenuItem>}
        {canSync && (
          <DropdownMenuItem disabled={syncing} onClick={() => onSync(item.id)}>
            Sincronizar agora
          </DropdownMenuItem>
        )}
        {canUpdate && <CaptureToggle item={item} />}{' '}
        {canDelete && (
          <DropdownMenuItem className="text-destructive" onClick={() => onRemove(item)}>
            Excluir configuração
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function CaptureToggle({ item }: { item: CaptureConfiguration }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => judicialCaptureApi.update(item.id, { capturaAtiva: !item.capturaAtiva }),
    onSuccess: () => {
      toast.success(item.capturaAtiva ? 'Captura pausada.' : 'Captura ativada.');
      void qc.invalidateQueries({ queryKey: ['capture-configurations'] });
    },
  });
  return (
    <DropdownMenuItem onClick={() => mutation.mutate()}>
      {item.capturaAtiva ? 'Pausar captura' : 'Ativar captura'}
    </DropdownMenuItem>
  );
}

function CaptureDialog({
  item,
  contextualClientId,
  onClose,
}: {
  item: CaptureConfiguration | null;
  contextualClientId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const contextualClient = useQuery({
    queryKey: ['client', contextualClientId],
    queryFn: () => clientsApi.get(contextualClientId!),
    enabled: Boolean(contextualClientId),
  });
  const [cnj, setCnj] = React.useState(item?.numeroCnj ?? '');
  const [active, setActive] = React.useState(item?.capturaAtiva ?? true);
  const [verified, setVerified] = React.useState<Awaited<
    ReturnType<typeof judicialCaptureApi.verify>
  > | null>(null);
  const contextualProcessValid =
    !contextualClientId || verified?.processoRelacionado?.cliente.id === contextualClientId;
  const valid = isValidCnj(cnj);
  const verify = useMutation({
    mutationFn: () => judicialCaptureApi.verify(cnj),
    onSuccess: setVerified,
    onError: () => toast.error('Não foi possível consultar a fonte judicial.'),
  });
  const save = useMutation({
    mutationFn: () =>
      item
        ? judicialCaptureApi.update(item.id, {
            numeroCnj: cnj,
            capturaAtiva: active,
            processoId: verified?.processoRelacionado?.id,
          })
        : judicialCaptureApi.create({
            numeroCnj: cnj,
            capturaAtiva: active,
            processoId: verified?.processoRelacionado?.id,
          }),
    onSuccess: () => {
      toast.success(item ? 'Configuração atualizada.' : 'Configuração criada.');
      void qc.invalidateQueries({ queryKey: ['capture-configurations'] });
      onClose();
    },
    onError: (e) => toast.error((e as { message?: string }).message ?? 'Não foi possível salvar.'),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar configuração' : 'Nova configuração'}</DialogTitle>
          <DialogDescription>
            Informe um número CNJ válido. Nenhum Processo será criado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5 pr-2">
          {contextualClientId && (
            <Alert>
              <AlertTitle>Cliente de origem</AlertTitle>
              <AlertDescription>
                {contextualClient.data?.nome ?? 'Carregando Cliente...'} — o Processo localizado pelo
                CNJ deve pertencer a este Cliente.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="capture-cnj">Número CNJ</Label>
            <Input
              id="capture-cnj"
              className="font-mono"
              placeholder="0000000-00.0000.0.00.0000"
              value={cnj}
              onChange={(e) => {
                setCnj(e.target.value);
                setVerified(null);
              }}
              aria-invalid={Boolean(cnj && !valid)}
            />
            {cnj && !valid && (
              <p role="alert" className="text-sm text-destructive">
                Número CNJ inválido.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!valid || verify.isPending}
            loading={verify.isPending}
            onClick={() => verify.mutate()}
          >
            Verificar processo
          </Button>
          {verified &&
            (verified.found ? (
              <Alert>
                <AlertTitle>Processo encontrado</AlertTitle>
                <AlertDescription>
                  <span className="mt-2 grid gap-1 text-sm">
                    <span>CNJ: {verified.process?.numeroCnj}</span>
                    {verified.process?.tribunal && (
                      <span>Tribunal: {verified.process.tribunal}</span>
                    )}
                    {verified.process?.orgaoJulgador && (
                      <span>Órgão julgador: {verified.process.orgaoJulgador}</span>
                    )}
                    {verified.process?.classe && <span>Classe: {verified.process.classe}</span>}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Processo não localizado</AlertTitle>
                <AlertDescription>
                  Não foi possível localizar este processo na fonte consultada.
                </AlertDescription>
              </Alert>
            ))}
          {verified?.processoRelacionado && (
            <Alert>
              <AlertTitle>Processo vinculado</AlertTitle>
              <AlertDescription>
                <Link
                  className="font-medium hover:underline"
                  href={`/processos/${verified.processoRelacionado.id}`}
                >
                  {verified.processoRelacionado.titulo}
                </Link>
                <br />
                Cliente:{' '}
                <Link
                  className="hover:underline"
                  href={`/clientes/${verified.processoRelacionado.cliente.id}`}
                >
                  {verified.processoRelacionado.cliente.nome}
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {contextualClientId && verified && !contextualProcessValid && (
            <Alert variant="destructive">
              <AlertTitle>Processo incompatível</AlertTitle>
              <AlertDescription>
                Selecione um CNJ vinculado ao Cliente de origem. Nenhuma associação entre escritórios
                ou Clientes diferentes será criada.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="capture-active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <Label htmlFor="capture-active">Captura ativa</Label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || save.isPending || !contextualProcessValid}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ item, onClose }: { item: CaptureConfiguration; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['capture-configuration', item.id],
    queryFn: () => judicialCaptureApi.get(item.id),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de sincronização</DialogTitle>
          <DialogDescription>{item.numeroCnj}</DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <Skeleton className="h-40" />
        ) : !detail.data?.historicos?.length ? (
          <EmptyState icon={History} title="Nenhuma sincronização realizada" />
        ) : (
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Novidades</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.data.historicos.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{dt(h.criadoEm)}</TableCell>
                    <TableCell>{h.provider}</TableCell>
                    <TableCell>{h.resultado}</TableCell>
                    <TableCell>{h.novidades}</TableCell>
                    <TableCell>{h.erroPublico ?? '--'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
