'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';
import { Check, Copy, Download, Eye, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AiSummaryPanel } from '@/features/ai';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FilterBar } from '@/components/data-display/filter-bar';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Publication, PublicationSituation, publicationsApi } from '../api/publications.api';

const Q = {
  q: parseAsString.withDefault(''),
  cnj: parseAsString.withDefault(''),
  processo: parseAsString.withDefault(''),
  cliente: parseAsString.withDefault(''),
  tribunal: parseAsString.withDefault(''),
  tipo: parseAsString.withDefault(''),
  situacao: parseAsStringEnum<PublicationSituation | ''>([
    '',
    'NOVA',
    'LIDA',
    'PENDENTE',
  ]).withDefault(''),
  publicacaoDe: parseAsString.withDefault(''),
  publicacaoAte: parseAsString.withDefault(''),
  cadastroDe: parseAsString.withDefault(''),
  cadastroAte: parseAsString.withDefault(''),
  responsavelId: parseAsString.withDefault(''),
  novas: parseAsBoolean.withDefault(false),
  naoLidas: parseAsBoolean.withDefault(false),
  comMovimento: parseAsBoolean.withDefault(false),
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
    canDelete = usePermission('publication:delete');
  const qc = useQueryClient();
  const [f, setF] = useQueryStates(Q);
  const [draft, setDraft] = React.useState(f);
  const [selected, setSelected] = React.useState<string | null>(f.publicacao || null);
  const [deleting, setDeleting] = React.useState<Publication | null>(null);
  const params = {
    q: f.q || undefined,
    cnj: f.cnj || undefined,
    processo: f.processo || undefined,
    cliente: f.cliente || undefined,
    tribunal: f.tribunal || undefined,
    tipo: f.tipo || undefined,
    situacao: f.situacao || undefined,
    publicacaoDe: iso(f.publicacaoDe),
    publicacaoAte: iso(f.publicacaoAte, true),
    cadastroDe: iso(f.cadastroDe),
    cadastroAte: iso(f.cadastroAte, true),
    responsavelId: f.responsavelId || undefined,
    somenteNovas: f.novas || undefined,
    somenteNaoLidas: f.naoLidas || undefined,
    somenteComMovimentacao: f.comMovimento || undefined,
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
  if (!allowed) return null;
  const active = Object.entries(f).filter(
    ([k, v]) => !['sort', 'page', 'publicacao'].includes(k) && Boolean(v),
  ).length;
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
      {query.data && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric title="Total de publicações" value={query.data.indicators.total} />
          <Metric title="Novas" value={query.data.indicators.novas} />
          <Metric title="Lidas" value={query.data.indicators.lidas} />
          <Metric title="Pendentes" value={query.data.indicators.pendentes} />
          <Metric
            title="Última sincronização"
            value={fmt(query.data.indicators.ultimaSincronizacao)}
          />
        </div>
      )}
      <FilterBar
        activeCount={active}
        onClear={() => {
          const clean = {
            ...draft,
            q: '',
            cnj: '',
            processo: '',
            cliente: '',
            tribunal: '',
            tipo: '',
            situacao: '' as const,
            publicacaoDe: '',
            publicacaoAte: '',
            cadastroDe: '',
            cadastroAte: '',
            responsavelId: '',
            novas: false,
            naoLidas: false,
            comMovimento: false,
            page: 1,
          };
          setDraft(clean);
          void setF(clean);
        }}
      >
        <Input
          aria-label="Pesquisa"
          placeholder="Pesquisar conteúdo ou resumo"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
        />
        <Input
          aria-label="Número CNJ"
          placeholder="Número CNJ"
          value={draft.cnj}
          onChange={(e) => setDraft({ ...draft, cnj: e.target.value })}
        />
        <Input
          aria-label="Número do Processo"
          placeholder="Número do Processo"
          value={draft.processo}
          onChange={(e) => setDraft({ ...draft, processo: e.target.value })}
        />
        <Input
          aria-label="Cliente"
          placeholder="Cliente"
          value={draft.cliente}
          onChange={(e) => setDraft({ ...draft, cliente: e.target.value })}
        />
        <Input
          aria-label="Tribunal"
          placeholder="Tribunal"
          value={draft.tribunal}
          onChange={(e) => setDraft({ ...draft, tribunal: e.target.value })}
        />
        <Input
          aria-label="Tipo"
          placeholder="Tipo"
          value={draft.tipo}
          onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
        />
        <Select
          value={draft.situacao || 'TODAS'}
          onValueChange={(v) =>
            setDraft({ ...draft, situacao: v === 'TODAS' ? '' : (v as PublicationSituation) })
          }
        >
          <SelectTrigger aria-label="Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas as situações</SelectItem>
            <SelectItem value="NOVA">Nova</SelectItem>
            <SelectItem value="LIDA">Lida</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <DateInput
          label="Data inicial da publicação"
          value={draft.publicacaoDe}
          onChange={(v) => setDraft({ ...draft, publicacaoDe: v })}
        />
        <DateInput
          label="Data final da publicação"
          value={draft.publicacaoAte}
          onChange={(v) => setDraft({ ...draft, publicacaoAte: v })}
        />
        <DateInput
          label="Data inicial de cadastro"
          value={draft.cadastroDe}
          onChange={(v) => setDraft({ ...draft, cadastroDe: v })}
        />
        <DateInput
          label="Data final de cadastro"
          value={draft.cadastroAte}
          onChange={(v) => setDraft({ ...draft, cadastroAte: v })}
        />
        <Input
          aria-label="Responsável"
          placeholder="ID do responsável"
          value={draft.responsavelId}
          onChange={(e) => setDraft({ ...draft, responsavelId: e.target.value })}
        />
        <Toggle
          label="Somente novas"
          checked={draft.novas}
          onChange={(v) => setDraft({ ...draft, novas: v })}
        />
        <Toggle
          label="Somente não lidas"
          checked={draft.naoLidas}
          onChange={(v) => setDraft({ ...draft, naoLidas: v })}
        />
        <Toggle
          label="Somente com movimentação"
          checked={draft.comMovimento}
          onChange={(v) => setDraft({ ...draft, comMovimento: v })}
        />
        <Select value={draft.sort} onValueChange={(v) => setDraft({ ...draft, sort: v })}>
          <SelectTrigger aria-label="Ordenação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-dataPublicacao">Data publicação ↓</SelectItem>
            <SelectItem value="dataPublicacao">Data publicação ↑</SelectItem>
            <SelectItem value="-capturadoEm">Cadastro ↓</SelectItem>
            <SelectItem value="capturadoEm">Cadastro ↑</SelectItem>
            <SelectItem value="cnj">CNJ</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="tribunal">Tribunal</SelectItem>
            <SelectItem value="-ultimaMovimentacao">Última movimentação</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setF({ ...draft, page: 1 })}>Consultar</Button>
      </FilterBar>
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
                {[
                  'Data da publicação',
                  'Data de cadastro',
                  'CNJ',
                  'Processo',
                  'Cliente',
                  'Tribunal',
                  'Tipo',
                  'Resumo',
                  'Última movimentação',
                  'Situação',
                  'Ações',
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <button
                      className="text-left text-primary hover:underline"
                      onClick={() => setSelected(p.id)}
                    >
                      {fmt(p.dataPublicacao)}
                    </button>
                  </TableCell>
                  <TableCell>{fmt(p.capturadoEm)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.numeroCnj}</TableCell>
                  <TableCell>
                    {p.processo ? (
                      <Link href={`/processos/${p.processo.id}`} className="hover:underline">
                        {p.processo.titulo}
                      </Link>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>
                    {p.processo ? (
                      <Link href={`/clientes/${p.processo.cliente.id}`} className="hover:underline">
                        {p.processo.cliente.nome}
                      </Link>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>{p.tribunal ?? '--'}</TableCell>
                  <TableCell>{p.tipoComunicacao ?? '--'}</TableCell>
                  <TableCell className="max-w-64 truncate">{p.conteudo ?? '--'}</TableCell>
                  <TableCell>
                    {p.movimentoRelacionado ? (
                      <button
                        className="max-w-52 text-left hover:underline"
                        onClick={() => setSelected(p.id)}
                      >
                        {fmt(p.movimentoRelacionado.dataMovimento)} ·{' '}
                        {p.movimentoRelacionado.descricao}
                      </button>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.situacao === 'LIDA'
                          ? 'success'
                          : p.situacao === 'NOVA'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {p.situacao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex">
                      <FavoriteButton
                        favorito={p.favorita}
                        isPending={fav.isPending}
                        onToggle={() => fav.mutate(p.id)}
                        label={p.favorita ? 'Remover dos favoritos' : 'Favoritar publicação'}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Visualizar publicação"
                        onClick={() => setSelected(p.id)}
                      >
                        <Eye />
                      </Button>
                      {canUpdate && !p.lida && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Marcar como lida"
                          onClick={() => read.mutate(p.id)}
                        >
                          <Check />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir publicação"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
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
                  <p className="text-sm leading-6 whitespace-pre-wrap">{p.conteudo ?? '--'}</p>
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
function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">{value}</CardContent>
    </Card>
  );
}
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="date"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={label} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={label}>{label}</Label>
    </div>
  );
}
function iso(v: string, end = false) {
  return v ? new Date(`${v}T${end ? '23:59:59' : '00:00:00'}`).toISOString() : undefined;
}
