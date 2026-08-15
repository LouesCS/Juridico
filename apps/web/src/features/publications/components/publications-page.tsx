'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Link2,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiSummaryPanel } from '@/features/ai';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
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
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { Publication, publicationsApi } from '../api/publications.api';
import { PublicationFilters, type PublicationFilterValues } from './publication-filters';

const Q = {
  q: parseAsString.withDefault(''),
  cidade: parseAsString.withDefault(''),
  diario: parseAsString.withDefault(''),
  nomeVinculo: parseAsString.withDefault(''),
  orgao: parseAsString.withDefault(''),
  vara: parseAsString.withDefault(''),
  processoNaPublicacao: parseAsString.withDefault(''),
  clientePastaId: parseAsString.withDefault(''),
  encarregadoPastaId: parseAsString.withDefault(''),
  parteContrariaPastaId: parseAsString.withDefault(''),
  pastaId: parseAsString.withDefault(''),
  processoId: parseAsString.withDefault(''),
  vinculoTarefa: parseAsStringEnum<'' | 'COM' | 'SEM'>(['', 'COM', 'SEM']).withDefault(''),
  timeline: parseAsStringEnum<'' | 'COM' | 'SEM'>(['', 'COM', 'SEM']).withDefault(''),
  vinculoPasta: parseAsStringEnum<'' | 'COM' | 'SEM'>(['', 'COM', 'SEM']).withDefault(''),
  visualizacao: parseAsStringEnum<'' | 'OCULTAS' | 'NAO_OCULTAS'>([
    '',
    'OCULTAS',
    'NAO_OCULTAS',
  ]).withDefault(''),
  publicacaoDe: parseAsString.withDefault(''),
  publicacaoAte: parseAsString.withDefault(''),
  cadastroDe: parseAsString.withDefault(''),
  cadastroAte: parseAsString.withDefault(''),
  sort: parseAsString.withDefault('-dataPublicacao'),
  page: parseAsInteger.withDefault(1),
  publicacao: parseAsString.withDefault(''),
};
const fmt = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(v),
      )
    : '--';
export function PublicationsPage() {
  const allowed = usePermission('publication:read'),
    canExport = usePermission('publication:manage'),
    canUpdate = usePermission('publication:update'),
    canCreateTask = usePermission('task:create');
  const qc = useQueryClient();
  const [f, setF] = useQueryStates(Q);
  const [selected, setSelected] = React.useState<string | null>(f.publicacao || null);
  const [deleting, setDeleting] = React.useState<Publication | null>(null);
  const [linking, setLinking] = React.useState<Publication | null>(null);
  const params = {
    q: f.q || undefined,
    cnj: f.processoNaPublicacao || undefined,
    processoId: f.processoId || undefined,
    pastaId: f.pastaId || undefined,
    clientePastaId: f.clientePastaId || undefined,
    encarregadoPastaId: f.encarregadoPastaId || undefined,
    parteContrariaPastaId: f.parteContrariaPastaId || undefined,
    cidade: f.cidade || undefined,
    diario: f.diario || undefined,
    nomeVinculo: f.nomeVinculo || undefined,
    orgao: f.orgao || undefined,
    vara: f.vara || undefined,
    vinculoTarefa: f.vinculoTarefa || undefined,
    timeline: f.timeline || undefined,
    vinculoPasta: f.vinculoPasta || undefined,
    visualizacao: f.visualizacao || undefined,
    publicacaoDe: iso(f.publicacaoDe),
    publicacaoAte: iso(f.publicacaoAte, true),
    cadastroDe: iso(f.cadastroDe),
    cadastroAte: iso(f.cadastroAte, true),
    sort: f.sort,
    page: f.page,
    limit: 20,
  };
  const query = useQuery({
    queryKey: ['publications', params],
    queryFn: () => publicationsApi.list(params),
    enabled: allowed,
  });
  const refreshPublication = () => {
    void qc.invalidateQueries({ queryKey: ['publications'] });
    if (selected) void qc.invalidateQueries({ queryKey: ['publication', selected] });
  };
  const read = useMutation({
    mutationFn: publicationsApi.read,
    onSuccess: () => {
      toast.success('Publicação marcada como lida.');
      refreshPublication();
    },
  });
  const fav = useMutation({
    mutationFn: publicationsApi.favorite,
    onSuccess: () => {
      toast.success('Favorito atualizado.');
      refreshPublication();
    },
  });
  const del = useMutation({
    mutationFn: publicationsApi.remove,
    onSuccess: () => {
      toast.success('Publicação removida.');
      setDeleting(null);
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ['publications'] });
    },
  });
  const visibility = useMutation({
    mutationFn: publicationsApi.toggleHidden,
    onSuccess: () => {
      toast.success('Visualização atualizada.');
      refreshPublication();
    },
  });
  if (!allowed) return null;
  const filterValues: PublicationFilterValues = {
    q: f.q,
    cidade: f.cidade,
    publicacaoDe: f.publicacaoDe,
    publicacaoAte: f.publicacaoAte,
    cadastroDe: f.cadastroDe,
    cadastroAte: f.cadastroAte,
    diario: f.diario,
    nomeVinculo: f.nomeVinculo,
    processoNaPublicacao: f.processoNaPublicacao,
    orgao: f.orgao,
    vara: f.vara,
    clientePastaId: f.clientePastaId,
    encarregadoPastaId: f.encarregadoPastaId,
    parteContrariaPastaId: f.parteContrariaPastaId,
    pastaId: f.pastaId,
    processoId: f.processoId,
    vinculoTarefa: f.vinculoTarefa,
    timeline: f.timeline,
    vinculoPasta: f.vinculoPasta,
    visualizacao: f.visualizacao,
  };
  async function exportCsv() {
    try {
      const r = await publicationsApi.export(params);
      const keys = Object.keys(r.items[0] ?? {});
      const csv = [
        keys.join(';'),
        ...r.items.map((row) =>
          keys.map((k) => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(';'),
        ),
      ].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
      a.download = 'publicacoes.csv';
      a.click();
      toast.success(`${r.items.length} publicações exportadas.`);
    } catch {
      toast.error('Não foi possível exportar as publicações.');
    }
  }
  return (
    <div>
      <PageHeader
        title="Publicações"
        description="Publicações judiciais normalizadas pelas configurações de captura."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Publicações' }]}
        actions={
          <>
            <Button variant="outline" loading={query.isFetching} onClick={() => query.refetch()}>
              <RefreshCw />
              Atualizar
            </Button>
            {canExport && (
              <Button variant="outline" onClick={exportCsv}>
                <Download />
                Exportar
              </Button>
            )}
          </>
        }
      />
      <PublicationFilters
        value={filterValues}
        onApply={(next) => void setF({ ...next, page: 1 })}
      />
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState
          title="Não foi possível carregar as publicações."
          onRetry={() => query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma publicação encontrada."
          description="Nenhuma publicação foi capturada até o momento."
          action={
            <Button asChild>
              <Link href="/configuracoes-captura">Ir para Configurações de Captura</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%] min-w-72 py-2.5 align-top">
                  <ColumnHeader labels={['DATA DA PUBLICAÇÃO', 'DATA DE CADASTRO', 'DESCRIÇÃO']} />
                </TableHead>
                <TableHead className="w-[22%] min-w-52 py-2.5 align-top">
                  <ColumnHeader labels={['DIÁRIO', 'CIDADE', 'ÓRGÃO', 'VARA']} />
                </TableHead>
                <TableHead className="w-[28%] min-w-64 py-2.5 align-top">
                  <ColumnHeader
                    labels={[
                      'NOME DE VÍNCULO',
                      'PROCESSO NA PUBLICAÇÃO',
                      'PASTA',
                      'PROCESSO VINCULADO',
                    ]}
                  />
                </TableHead>
                <TableHead className="w-[14%] py-2.5 align-top">TAREFAS</TableHead>
                <TableHead className="w-[14%] py-2.5 align-top">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="min-w-72 align-top">
                    <Stack>
                      <Link className="text-primary hover:underline" href={`/publicacoes/${p.id}`}>
                        {fmt(p.dataPublicacao)}
                      </Link>
                    </Stack>
                    <Stack value={fmt(p.capturadoEm)} />
                    <Stack value={p.conteudo ?? '--'} truncate />
                  </TableCell>
                  <TableCell className="min-w-52 align-top">
                    <Stack value={p.diario ?? '--'} truncate />
                    <Stack value={p.cidade ?? '--'} truncate />
                    <Stack value={p.orgao ?? p.tribunal ?? '--'} truncate />
                    <Stack value={p.vara ?? '--'} truncate />
                  </TableCell>
                  <TableCell className="min-w-64 align-top">
                    <Stack value={p.nomeVinculo ?? '--'} truncate />
                    <Stack value={p.numeroCnj || '--'} mono />
                    <Stack title={p.pastaJuridica?.nome} truncate>
                      {p.pastaJuridica ? (
                        <Link
                          className="text-primary hover:underline"
                          href={`/pastas/${p.pastaJuridica.id}`}
                        >
                          {p.pastaJuridica.nome}
                        </Link>
                      ) : (
                        '--'
                      )}
                    </Stack>
                    <Stack title={p.processo?.titulo} truncate>
                      {p.processo ? (
                        <Link
                          className="text-primary hover:underline"
                          href={`/processos/${p.processo.id}`}
                        >
                          {p.processo.titulo}
                        </Link>
                      ) : (
                        '--'
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="secondary">{p.tarefasTotal}</Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Ações da publicação">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(p.id)}>
                          <Eye />
                          Visualizar
                        </DropdownMenuItem>
                        {canCreateTask && (
                          <DropdownMenuItem asChild>
                            <TaskFormDialog
                              mode="create"
                              fixedVinculos={[
                                { tipoRecurso: 'PUBLICACAO', recursoId: p.id, label: 'Publicação' },
                              ]}
                              trigger={
                                <button className="flex w-full items-center px-2 py-1.5 text-sm">
                                  Tarefa em branco
                                </button>
                              }
                            />
                          </DropdownMenuItem>
                        )}
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => setLinking(p)}>
                            <Link2 />
                            Vincular
                          </DropdownMenuItem>
                        )}
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => visibility.mutate(p.id)}>
                            <EyeOff />
                            {p.oculta ? 'Desocultar' : 'Ocultar'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {query.data && query.data.total > 20 && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={f.page <= 1}
            onClick={() => setF({ page: f.page - 1 })}
          >
            Anterior
          </Button>
          <span className="self-center text-sm">Página {f.page}</span>
          <Button
            variant="outline"
            disabled={f.page * 20 >= query.data.total}
            onClick={() => setF({ page: f.page + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}
      <Detail
        id={selected}
        onClose={() => {
          setSelected(null);
          void setF({ publicacao: '' });
        }}
        onRead={(id) => read.mutate(id)}
        onFavorite={(id) => fav.mutate(id)}
      />
      <PublicationLinkDialog
        publication={linking}
        onClose={() => setLinking(null)}
        onSaved={refreshPublication}
      />
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title="Excluir publicação"
          description="A publicação normalizada será removida. Processo e Cliente serão preservados."
          confirmLabel="Excluir"
          loading={del.isPending}
          onConfirm={() => del.mutate(deleting.id)}
        />
      )}
    </div>
  );
}
function Stack({
  value,
  children,
  truncate,
  mono,
  title,
}: {
  value?: string;
  children?: React.ReactNode;
  truncate?: boolean;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="min-h-5 leading-5">
      <span
        title={truncate ? (title ?? value) : undefined}
        className={`${truncate ? 'block max-w-72 truncate' : ''} ${mono ? 'font-mono text-xs' : 'text-sm'}`}
      >
        {children ?? value ?? '--'}
      </span>
    </div>
  );
}

function ColumnHeader({ labels }: { labels: string[] }) {
  return (
    <div>
      {labels.map((label, index) => (
        <span key={label} className={index === 0 ? 'block' : 'block text-xs font-normal'}>
          {label}
        </span>
      ))}
    </div>
  );
}

function PublicationLinkDialog({
  publication,
  onClose,
  onSaved,
}: {
  publication: Publication | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [folderId, setFolderId] = React.useState('');
  const [processId, setProcessId] = React.useState('NONE');
  const folders = useQuery({
    queryKey: ['legal-folders', 'publication-link'],
    queryFn: () => legalFoldersApi.list({ page: 1, limit: 50 }),
    enabled: !!publication,
  });
  const selectedFolder = folders.data?.items.find((folder) => folder.id === folderId);
  const mutation = useMutation({
    mutationFn: () =>
      publicationsApi.link(publication!.id, {
        pastaJuridicaId: folderId,
        processoId: processId === 'NONE' ? null : processId,
      }),
    onSuccess: () => {
      toast.success('Publicação vinculada.');
      onSaved();
      onClose();
    },
    onError: () => toast.error('Não foi possível vincular a publicação.'),
  });
  React.useEffect(() => {
    setFolderId(publication?.pastaJuridica?.id ?? '');
    setProcessId(publication?.processo?.id ?? 'NONE');
  }, [publication]);
  return (
    <Dialog open={!!publication} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vinculação de publicações</DialogTitle>
          <DialogDescription>
            Número do processo: {publication?.numeroCnj ?? '--'}
            <br />
            Descrição: {publication?.conteudo ?? '--'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pasta *</Label>
            <Select
              value={folderId}
              onValueChange={(value) => {
                setFolderId(value);
                setProcessId('NONE');
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={folders.isLoading ? 'Carregando...' : 'Selecione a Pasta'}
                />
              </SelectTrigger>
              <SelectContent>
                {folders.data?.items.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Processo judicial</Label>
            <Select disabled={!folderId} value={processId} onValueChange={setProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sem Processo</SelectItem>
                {selectedFolder?.processos
                  .filter(({ processo }) => processo.tipo === 'JUDICIAL')
                  .map(({ processo }) => (
                    <SelectItem key={processo.id} value={processo.id}>
                      {processo.numeroCnj ?? processo.titulo}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!folderId}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Detail({
  id,
  onClose,
  onRead,
  onFavorite,
}: {
  id: string | null;
  onClose: () => void;
  onRead: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  const q = useQuery({
    queryKey: ['publication', id],
    queryFn: () => publicationsApi.get(id!),
    enabled: !!id,
  });
  React.useEffect(() => {
    if (id) void publicationsApi.viewed(id);
  }, [id]);
  const p = q.data;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:w-[42rem]">
        <SheetTitle>Detalhe da publicação</SheetTitle>
        {q.isLoading ? (
          <Skeleton className="h-80" />
        ) : p ? (
          <Tabs defaultValue="publication">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="publication">Publicação</TabsTrigger>
              <TabsTrigger value="movement">Movimentação</TabsTrigger>
              <TabsTrigger value="ai">Resumo IA</TabsTrigger>
              <TabsTrigger value="related">Relacionados</TabsTrigger>
            </TabsList>
            <TabsContent value="publication" className="space-y-4">
              <div className="flex gap-2">
                <FavoriteButton
                  favorito={p.favorita}
                  onToggle={() => onFavorite(p.id)}
                  label="Favoritar publicação"
                />
                {!p.lida && (
                  <Button size="sm" onClick={() => onRead(p.id)}>
                    Marcar como lida
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(p.conteudo ?? '');
                    toast.success('Texto copiado.');
                  }}
                >
                  <Copy />
                  Copiar
                </Button>
              </div>
              <Props p={p} />
              <Card>
                <CardHeader>
                  <CardTitle>Texto completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpandableDescription text={p.conteudo ?? '--'} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="movement">
              <Card>
                <CardHeader>
                  <CardTitle>Movimentação relacionada</CardTitle>
                </CardHeader>
                <CardContent>
                  {p.movimentoRelacionado ? (
                    <div className="space-y-2">
                      <p>{fmt(p.movimentoRelacionado.dataMovimento)}</p>
                      <p className="whitespace-pre-wrap">{p.movimentoRelacionado.descricao}</p>
                      <Badge variant="outline">{p.movimentoRelacionado.tipo}</Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma movimentação relacionada.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ai">
              {p.processo ? (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Resumo reutiliza o contexto e as fontes do Processo vinculado.
                  </p>
                  <AiSummaryPanel escopoTipo="PROCESSO" escopoId={p.processo.id} />
                </>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Vincule um Processo para utilizar o Resumo IA."
                />
              )}
            </TabsContent>
            <TabsContent value="related">
              <Related p={p} />
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
function Props({ p }: { p: Publication }) {
  return (
    <Card>
      <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
        <span>
          <b>CNJ:</b> {p.numeroCnj}
        </span>
        <span>
          <b>Tribunal:</b> {p.tribunal ?? '--'}
        </span>
        <span>
          <b>Tipo:</b> {p.tipoComunicacao ?? '--'}
        </span>
        <span>
          <b>Fonte:</b> {p.provider}
        </span>
        <span>
          <b>Data publicação:</b> {fmt(p.dataPublicacao)}
        </span>
        <span>
          <b>Data captura:</b> {fmt(p.capturadoEm)}
        </span>
      </CardContent>
    </Card>
  );
}
function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const long = text.length > 500;
  return (
    <div>
      <p
        className={`text-sm leading-6 whitespace-pre-wrap ${long && !expanded ? 'max-h-36 overflow-hidden' : ''}`}
      >
        {text}
      </p>
      {long && (
        <Button variant="link" className="px-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </Button>
      )}
    </div>
  );
}
function Related({ p }: { p: Publication }) {
  return (
    <div className="grid gap-3">
      {p.processo && (
        <>
          <Button asChild variant="outline">
            <Link href={`/clientes/${p.processo.cliente.id}`}>
              Cliente: {p.processo.cliente.nome}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/processos/${p.processo.id}`}>Processo: {p.processo.titulo}</Link>
          </Button>
          {p.processo.pastas.map((x) => (
            <Button key={x.id} asChild variant="outline">
              <Link href={`/documentos?pastaId=${x.id}`}>Pasta: {x.nome}</Link>
            </Button>
          ))}
          <Button asChild variant="outline">
            <Link href={`/processos/${p.processo.id}?tab=timeline`}>Timeline</Link>
          </Button>
        </>
      )}
      {p.processo?.configuracoesCaptura?.[0] && (
        <Button asChild variant="outline">
          <Link
            href={`/configuracoes-captura?configuracao=${p.processo.configuracoesCaptura[0].id}`}
          >
            Configuração de captura
          </Link>
        </Button>
      )}
    </div>
  );
}
function iso(v: string, end = false) {
  return v ? new Date(`${v}T${end ? '23:59:59' : '00:00:00'}`).toISOString() : undefined;
}
