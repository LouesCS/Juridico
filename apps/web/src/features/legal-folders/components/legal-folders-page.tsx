'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';
import {
  ChevronDown,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { usePermission } from '@/hooks/use-permission';
import { clientsApi } from '@/features/clients/api/clients.api';
import { collaboratorsApi } from '@/features/team/api/collaborators.api';
import type { ExtraFieldDTO } from '@/features/configuration/api/configuration.api';
import {
  legalFoldersApi,
  type LegalFolderSummary,
  type UpsertLegalFolder,
} from '../api/legal-folders.api';
import { useLegalFolder, useLegalFolders } from '../api/queries';

const FILTERS = {
  q: parseAsString.withDefault(''),
  clienteId: parseAsString.withDefault(''),
  situacao: parseAsString.withDefault(''),
  encarregadoId: parseAsString.withDefault(''),
  sort: parseAsString.withDefault('-atualizadoEm'),
  assunto: parseAsString.withDefault(''),
  parteContraria: parseAsString.withDefault(''),
  processo: parseAsString.withDefault(''),
  cnj: parseAsString.withDefault(''),
  criadoDe: parseAsString.withDefault(''),
  criadoAte: parseAsString.withDefault(''),
  possuiProcesso: parseAsString.withDefault(''),
  possuiCaptura: parseAsString.withDefault(''),
};
const statusLabel: Record<string, string> = {
  BAIXADO: 'Baixado',
  CONTRARIO: 'Contrário',
  DESISTENCIA: 'Desistência',
  ANDAMENTO_FAVORAVEL: 'Andamento Favorável',
  INVIAVEL: 'Inviável',
  SUBSTABELECIDO: 'Substabelecido',
  SUSPENSO: 'Suspenso',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ARQUIVADA: 'Arquivada',
  SUSPENSA: 'Suspensa',
};

export function LegalFoldersPage() {
  const searchParams = useSearchParams();
  const canCreate = usePermission('legal-folder:create');
  const canUpdate = usePermission('legal-folder:update');
  const canArchive = usePermission('legal-folder:delete');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useQueryStates(FILTERS);
  const [draft, setDraft] = React.useState(filters);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [form, setForm] = React.useState<LegalFolderSummary | null | undefined>(undefined);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
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
      canCreate &&
      !contextualCreationOpened.current &&
      contextualParams?.get('nova') === '1'
    ) {
      contextualCreationOpened.current = true;
      setForm(null);
    }
  }, [canCreate, contextualParams]);
  const archive = useMutation({
    mutationFn: legalFoldersApi.archive,
    onSuccess: () => {
      toast.success('Pasta arquivada.');
      void queryClient.invalidateQueries({ queryKey: ['legal-folders'] });
    },
    onError: () => toast.error('Não foi possível arquivar a Pasta.'),
  });
  const query = useLegalFolders({
    ...filters,
    clienteId: filters.clienteId || undefined,
    situacao: filters.situacao || undefined,
    encarregadoId: filters.encarregadoId || undefined,
    assunto: filters.assunto || undefined,
    parteContraria: filters.parteContraria || undefined,
    processo: filters.processo || undefined,
    cnj: filters.cnj || undefined,
    criadoDe: filters.criadoDe ? new Date(`${filters.criadoDe}T00:00:00`).toISOString() : undefined,
    criadoAte: filters.criadoAte
      ? new Date(`${filters.criadoAte}T23:59:59`).toISOString()
      : undefined,
    possuiProcesso: filters.possuiProcesso ? filters.possuiProcesso === 'true' : undefined,
    possuiCaptura: filters.possuiCaptura ? filters.possuiCaptura === 'true' : undefined,
  });
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== 'sort' && Boolean(value),
  ).length;
  const advanced = [
    'assunto',
    'parteContraria',
    'processo',
    'cnj',
    'criadoDe',
    'criadoAte',
    'possuiProcesso',
    'possuiCaptura',
  ].filter((key) => Boolean(filters[key as keyof typeof filters])).length;
  const columns: DataTableColumn<LegalFolderSummary>[] = [
    {
      key: 'nome',
      header: 'Identificador',
      render: (item) => (
        <div className="min-w-52 space-y-1.5">
          <Link className="block font-medium hover:underline" href={`/pastas/${item.id}`}>
            {item.nome}
          </Link>
          {item.encarregado ? (
            <Link
              className="block text-sm text-muted-foreground hover:text-foreground hover:underline"
              href={`/colaboradores/${item.encarregado.id}`}
            >
              {item.encarregado.nome}
            </Link>
          ) : (
            <span className="block text-sm text-muted-foreground">—</span>
          )}
          <Badge variant={item.situacao === 'EM_ANDAMENTO' ? 'success' : 'secondary'}>
            {statusLabel[item.situacao] ?? item.situacao}
          </Badge>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (item) => (
        <div className="min-w-56 space-y-1.5">
          <span className="block font-medium">{item.categoria ?? '—'}</span>
          {item.assunto && (
            <span className="block text-sm text-muted-foreground">{item.assunto}</span>
          )}
          <Link
            className="block text-sm hover:underline"
            href={`/clientes/${item.clientePrincipal.id}`}
          >
            <span className="text-muted-foreground">Cliente principal: </span>
            {item.clientePrincipal.nome}
          </Link>
          {item.parteContrariaPrincipal ? (
            <Link
              className="block text-sm hover:underline"
              href={`/clientes/${item.parteContrariaPrincipal.id}`}
            >
              <span className="text-muted-foreground">Parte contrária principal: </span>
              {item.parteContrariaPrincipal.nome}
            </Link>
          ) : (
            <span className="block text-sm text-muted-foreground">
              Parte contrária principal: —
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'cadastro',
      header: 'Cadastro',
      render: (item) => (
        <div className="min-w-36 space-y-1.5 text-sm">
          <span className="block">
            <span className="text-muted-foreground">Data de cadastro: </span>
            {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
          </span>
          <span className="block">
            <span className="text-muted-foreground">Arquivada: </span>
            {item.arquivadoEm ? 'Sim' : 'Não'}
          </span>
        </div>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setPreviewId(item.id)}>
            Visualizar
          </Button>
          {canUpdate && (
            <Button size="sm" variant="ghost" onClick={() => setForm(item)}>
              Editar
            </Button>
          )}
          {canArchive && !item.arquivadoEm && (
            <Button
              size="sm"
              variant="ghost"
              disabled={archive.isPending}
              onClick={() => archive.mutate(item.id)}
            >
              Arquivar
            </Button>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];
  return (
    <div>
      <PageHeader
        title="Pastas"
        description="Dossiês jurídicos e contexto operacional dos casos."
        breadcrumbs={[{ label: 'Jurídico' }, { label: 'Pastas' }]}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Atualizar Pastas"
              onClick={() => query.refetch()}
            >
              <RefreshCw className="size-4" />
            </Button>
            {canCreate && (
              <Button onClick={() => setForm(null)}>
                <Plus className="size-4" />
                Nova Pasta
              </Button>
            )}
          </>
        }
      />
      <FilterBar
        activeCount={active}
        onClear={() => {
          const clean = Object.fromEntries(
            Object.entries(FILTERS).map(([key]) => [key, key === 'sort' ? '-atualizadoEm' : '']),
          ) as typeof filters;
          setDraft(clean);
          void setFilters(clean);
        }}
      >
        <Input
          className="sm:max-w-xs sm:flex-1"
          aria-label="Buscar Pastas"
          placeholder="Buscar Pasta, cliente, processo ou CNJ..."
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
        <Input
          className="sm:w-48"
          aria-label="Filtrar por Cliente"
          placeholder="Cliente"
          value={draft.clienteId}
          onChange={(event) => setDraft({ ...draft, clienteId: event.target.value })}
        />
        <Select
          value={draft.situacao || 'TODAS'}
          onValueChange={(value) =>
            setDraft({ ...draft, situacao: value === 'TODAS' ? '' : value })
          }
        >
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas as situações</SelectItem>
            {Object.entries(statusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="sm:w-48"
          aria-label="Filtrar por Encarregado"
          placeholder="Encarregado"
          value={draft.encarregadoId}
          onChange={(event) => setDraft({ ...draft, encarregadoId: event.target.value })}
        />
        <Select value={draft.sort} onValueChange={(sort) => setDraft({ ...draft, sort })}>
          <SelectTrigger className="sm:w-56" aria-label="Ordenação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome crescente</SelectItem>
            <SelectItem value="-nome">Nome decrescente</SelectItem>
            <SelectItem value="-criadoEm">Cadastro mais recente</SelectItem>
            <SelectItem value="criadoEm">Cadastro mais antigo</SelectItem>
            <SelectItem value="-atualizadoEm">Última modificação recente</SelectItem>
            <SelectItem value="atualizadoEm">Última modificação antiga</SelectItem>
            <SelectItem value="encarregadoId">Encarregado</SelectItem>
            <SelectItem value="situacao">Situação</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setMoreOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Mais filtros{advanced > 0 && <Badge variant="secondary">{advanced}</Badge>}
        </Button>
        <Button onClick={() => void setFilters(draft)}>
          <Search className="size-4" />
          Consultar
        </Button>
      </FilterBar>
      {query.isError ? (
        <ErrorState title="Não foi possível carregar as Pastas." onRetry={() => query.refetch()} />
      ) : (
          <DataTable
            columns={columns}
            data={query.data?.items ?? []}
            rowKey={(item) => item.id}
            isLoading={query.isLoading}
            emptyState={
              <EmptyState
                icon={FolderKanban}
                title={active ? 'Nenhuma Pasta encontrada' : 'Nenhuma Pasta cadastrada'}
                description={
                  active
                    ? 'Revise os filtros da consulta.'
                    : 'Crie a primeira Pasta Jurídica do escritório.'
                }
              />
            }
          />
      )}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="scrollbar-fade w-full overflow-y-auto sm:w-96">
          <SheetTitle>Mais filtros</SheetTitle>
          <div className="grid gap-3 pt-2">
            <Input
              aria-label="Assunto"
              placeholder="Assunto"
              value={draft.assunto}
              onChange={(e) => setDraft({ ...draft, assunto: e.target.value })}
            />
            <Input
              aria-label="Parte contrária"
              placeholder="Parte contrária"
              value={draft.parteContraria}
              onChange={(e) => setDraft({ ...draft, parteContraria: e.target.value })}
            />
            <Input
              aria-label="Processo"
              placeholder="Processo"
              value={draft.processo}
              onChange={(e) => setDraft({ ...draft, processo: e.target.value })}
            />
            <Input
              aria-label="CNJ"
              placeholder="CNJ"
              value={draft.cnj}
              onChange={(e) => setDraft({ ...draft, cnj: e.target.value })}
            />
            <Label htmlFor="folder-from">Cadastro inicial</Label>
            <Input
              id="folder-from"
              type="date"
              value={draft.criadoDe}
              onChange={(e) => setDraft({ ...draft, criadoDe: e.target.value })}
            />
            <Label htmlFor="folder-to">Cadastro final</Label>
            <Input
              id="folder-to"
              type="date"
              value={draft.criadoAte}
              onChange={(e) => setDraft({ ...draft, criadoAte: e.target.value })}
            />
            <Select
              value={draft.possuiProcesso || 'TODOS'}
              onValueChange={(value) =>
                setDraft({ ...draft, possuiProcesso: value === 'TODOS' ? '' : value })
              }
            >
              <SelectTrigger aria-label="Possui Processo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Com ou sem Processo</SelectItem>
                <SelectItem value="true">Possui Processo</SelectItem>
                <SelectItem value="false">Sem Processo</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={draft.possuiCaptura || 'TODOS'}
              onValueChange={(value) =>
                setDraft({ ...draft, possuiCaptura: value === 'TODOS' ? '' : value })
              }
            >
              <SelectTrigger aria-label="Possui captura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Com ou sem captura</SelectItem>
                <SelectItem value="true">Possui captura</SelectItem>
                <SelectItem value="false">Sem captura</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                void setFilters(draft);
                setMoreOpen(false);
              }}
            >
              Consultar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {form !== undefined && (
        <LegalFolderDialog
          item={form}
          initialClientId={form === null ? contextualClientId : undefined}
          onClose={() => setForm(undefined)}
        />
      )}
      <LegalFolderPreview id={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}

function LegalFolderPreview({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useLegalFolder(id ?? '');
  const formOptions = useQuery({
    queryKey: ['legal-folder-options'],
    queryFn: legalFoldersApi.options,
    enabled: Boolean(id),
  });
  const folder = detail.data;
  const explicitLinks = folder?.vinculosClientes ?? [];
  const parties = folder?.processos.flatMap(({ processo }) => processo.partes) ?? [];
  const otherClients = uniqueParties([
    ...explicitLinks
      .filter((link) => link.tipo === 'CLIENTE')
      .map((link) => ({
        id: link.cliente.id,
        nome: link.cliente.nome,
        clienteId: link.cliente.id,
      })),
    ...parties.filter(
      (party) =>
        party.ehNossoCliente &&
        party.clienteId !== folder?.clientePrincipal.id &&
        party.nome !== folder?.clientePrincipal.nome,
    ),
  ]);
  const otherOpposingParties = uniqueParties([
    ...explicitLinks
      .filter((link) => link.tipo === 'PARTE_CONTRARIA')
      .map((link) => ({
        id: link.cliente.id,
        nome: link.cliente.nome,
        clienteId: link.cliente.id,
      })),
    ...parties.filter(
      (party) =>
        !party.ehNossoCliente &&
        party.clienteId !== folder?.parteContrariaPrincipal?.id &&
        party.nome !== folder?.parteContrariaPrincipal?.nome,
    ),
  ]);
  const interested = explicitLinks
    .filter((link) => link.tipo === 'INTERESSADO')
    .map((link) => ({ id: link.cliente.id, nome: link.cliente.nome, clienteId: link.cliente.id }));
  const configuredFields = (formOptions.data?.camposExtras ?? [])
    .filter((field) => field.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:w-[34rem] sm:max-w-[90vw]"
      >
        <div className="shrink-0 border-b px-5 py-4 pr-12">
          <SheetTitle>Pasta</SheetTitle>
        </div>
        <div className="scrollbar-fade flex-1 overflow-y-auto px-5 py-5">
          {detail.isLoading ? (
            <div className="h-80 animate-pulse rounded bg-muted" aria-label="Carregando Pasta" />
          ) : folder ? (
            <div className="space-y-6">
              <PreviewSection title="Dados da Pasta">
                <PreviewProperty label="Identificador" value={folder.nome} />
                <PreviewProperty label="Assunto" value={folder.assunto} />
                <PreviewProperty label="Categoria" value={folder.categoria} />
                <PreviewProperty
                  label="Situação"
                  value={statusLabel[folder.situacao] ?? folder.situacao}
                />
                <PreviewProperty label="Encarregado">
                  {folder.encarregado ? (
                    <Link
                      className="hover:underline"
                      href={`/colaboradores/${folder.encarregado.id}`}
                    >
                      {folder.encarregado.nome}
                    </Link>
                  ) : (
                    '--'
                  )}
                </PreviewProperty>
                <PreviewProperty
                  label="Etapa"
                  value={folder.etapa === 'CADASTRAMENTO' ? 'Cadastramento' : folder.etapa}
                />
                <PreviewProperty label="Arquivada" value={folder.arquivadoEm ? 'Sim' : 'Não'} />
                <PreviewProperty
                  label="Data de cadastro"
                  value={formatPreviewDate(folder.criadoEm)}
                />
              </PreviewSection>
              <PreviewSection title="Vínculos">
                <PreviewProperty label="Cliente principal">
                  <Link
                    className="hover:underline"
                    href={`/clientes/${folder.clientePrincipal.id}`}
                  >
                    {folder.clientePrincipal.nome}
                  </Link>
                </PreviewProperty>
                <PreviewProperty label="Outros clientes">
                  <PartyLinks items={otherClients} />
                </PreviewProperty>
                <PreviewProperty label="Parte contrária principal">
                  {folder.parteContrariaPrincipal ? (
                    <Link
                      className="hover:underline"
                      href={`/clientes/${folder.parteContrariaPrincipal.id}`}
                    >
                      {folder.parteContrariaPrincipal.nome}
                    </Link>
                  ) : (
                    '--'
                  )}
                </PreviewProperty>
                <PreviewProperty label="Outras partes contrárias">
                  <PartyLinks items={otherOpposingParties} />
                </PreviewProperty>
                <PreviewProperty label="Interessados">
                  <PartyLinks items={interested} />
                </PreviewProperty>
              </PreviewSection>
              <PreviewSection title="Campos extras">
                {formOptions.isLoading ? (
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                ) : configuredFields.length ? (
                  configuredFields.map((field) => (
                    <PreviewProperty
                      key={field.id}
                      label={field.nome}
                      value={formatExtraField(field, folder.camposExtrasValores[field.chave])}
                    />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">--</span>
                )}
              </PreviewSection>
            </div>
          ) : (
            <p className="text-sm text-destructive">Não foi possível carregar a Pasta.</p>
          )}
        </div>
        <div className="flex shrink-0 justify-end border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type RelatedParty = { id: string; nome: string; clienteId: string | null };
function uniqueParties(items: RelatedParty[]) {
  return items.filter(
    (item, index) => items.findIndex((other) => other.nome === item.nome) === index,
  );
}
function PartyLinks({ items }: { items: RelatedParty[] }) {
  if (!items.length) return <>--</>;
  return (
    <span className="grid gap-1">
      {items.map((item) =>
        item.clienteId ? (
          <Link key={item.id} className="hover:underline" href={`/clientes/${item.clienteId}`}>
            {item.nome}
          </Link>
        ) : (
          <span key={item.id}>{item.nome}</span>
        ),
      )}
    </span>
  );
}
function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">{children}</dl>
    </section>
  );
}
function PreviewProperty({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:contents">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children ?? value ?? '--'}</dd>
    </div>
  );
}
function formatPreviewDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}
function formatExtraField(field: ExtraFieldDTO, raw?: string) {
  if (!raw) return '--';
  if (field.tipo === 'BOOLEANO')
    return ['true', '1', 'sim'].includes(raw.toLowerCase()) ? 'Sim' : 'Não';
  if (field.tipo === 'DATA')
    return /^\d{4}-\d{2}-\d{2}/.test(raw)
      ? new Date(`${raw.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
      : raw;
  if (field.tipo === 'MULTISELECT') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.join(', ') || '--';
    } catch {
      return (
        raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .join(', ') || '--'
      );
    }
  }
  return raw;
}

function LegalFolderDialog({
  item,
  initialClientId,
  onClose,
}: {
  item: LegalFolderSummary | null;
  initialClientId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const clients = useQuery({
    queryKey: ['clients', 'legal-folder-options'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });
  const members = useQuery({
    queryKey: ['members', 'legal-folder-options'],
    queryFn: () => collaboratorsApi.list({ limit: 100 }),
  });
  const options = useQuery({
    queryKey: ['legal-folder-options'],
    queryFn: legalFoldersApi.options,
  });
  const detail = useLegalFolder(item?.id ?? '');
  const [value, setValue] = React.useState<UpsertLegalFolder>({
    assunto: item?.assunto,
    categoria: item?.categoria,
    situacao: item?.situacao ?? 'ANDAMENTO_FAVORAVEL',
    clientePrincipalId: item?.clientePrincipal.id ?? initialClientId ?? '',
    parteContrariaPrincipalId: item?.parteContrariaPrincipal?.id,
    encarregadoId: item?.encarregado?.id ?? '',
    processoIds: item?.processos.map(({ processo }) => processo.id) ?? [],
    outrosClienteIds:
      item?.vinculosClientes
        ?.filter((link) => link.tipo === 'CLIENTE')
        .map((link) => link.cliente.id) ?? [],
    outrasPartesContrariasIds:
      item?.vinculosClientes
        ?.filter((link) => link.tipo === 'PARTE_CONTRARIA')
        .map((link) => link.cliente.id) ?? [],
    interessadoIds:
      item?.vinculosClientes
        ?.filter((link) => link.tipo === 'INTERESSADO')
        .map((link) => link.cliente.id) ?? [],
    camposExtrasValores: {},
  });
  React.useEffect(() => {
    if (!detail.data) return;
    setValue((current) => ({
      ...current,
      camposExtrasValores: detail.data.camposExtrasValores,
    }));
  }, [detail.data]);
  const missingRequiredExtra = (options.data?.camposExtras ?? []).some(
    (field) =>
      field.ativo &&
      field.obrigatorio &&
      !(value.camposExtrasValores?.[field.chave] ?? field.valorPadrao ?? '').trim(),
  );
  const save = useMutation({
    mutationFn: () => {
      if (!item) return legalFoldersApi.create(value);
      return legalFoldersApi.update(item.id, value);
    },
    onSuccess: () => {
      toast.success(item ? 'Pasta atualizada.' : 'Pasta criada.');
      void qc.invalidateQueries({ queryKey: ['legal-folders'] });
      onClose();
    },
    onError: () => toast.error('Não foi possível salvar a Pasta.'),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Pasta' : 'Nova Pasta'}</DialogTitle>
          <DialogDescription>
            Pasta Jurídica é o dossiê do caso. Folders documentais continuam dentro de Documentos.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4 pr-2 sm:grid-cols-2">
          <fieldset className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <legend className="mb-1 text-sm font-medium">Identificador *</legend>
            <CompactPicker
              ariaLabel="Cliente do Identificador"
              placeholder="Digite o nome do cliente..."
              items={clients.data?.items ?? []}
              selected={value.clientePrincipalId ? [value.clientePrincipalId] : []}
              loading={clients.isLoading}
              single
              disabled={Boolean(item)}
              onChange={(ids) => {
                const identifierClientId = ids[0] ?? '';
                const previousClients = [
                  value.clientePrincipalId,
                  ...(value.outrosClienteIds ?? []),
                ].filter(Boolean);
                const reconciled = identifierClientId
                  ? [
                      identifierClientId,
                      ...previousClients.filter((id) => id !== identifierClientId),
                    ]
                  : previousClients;
                setValue({
                  ...value,
                  clientePrincipalId: reconciled[0] ?? '',
                  outrosClienteIds: reconciled.slice(1),
                });
              }}
            />
            <div className="space-y-1">
              <Label htmlFor="lf-sequence">Número</Label>
              <Input
                id="lf-sequence"
                disabled
                value={item?.sequencial ? `Nº ${item.sequencial}` : 'Nº automático'}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              A numeração será gerada automaticamente quando a Pasta for salva, seguindo a sequência
              correspondente ao Identificador selecionado.
            </p>
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="lf-subject">Assunto *</Label>
            <Input
              id="lf-subject"
              value={value.assunto ?? ''}
              onChange={(e) => setValue({ ...value, assunto: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Etapa *</Label>
            <Input
              disabled
              value={
                item?.etapa === 'CADASTRAMENTO' || !item ? 'Cadastramento' : (item.etapa ?? '--')
              }
            />
          </div>
          <SelectField
            label="Categoria *"
            value={value.categoria ?? ''}
            onChange={(categoria) => setValue({ ...value, categoria })}
            options={(options.data?.categorias ?? []).map((categoria) => ({
              value: categoria.valor,
              label: categoria.label,
            }))}
          />
          <SelectField
            label="Situação *"
            value={value.situacao ?? 'EM_ANDAMENTO'}
            onChange={(situacao) => setValue({ ...value, situacao })}
            options={(options.data?.situacoes ?? []).map((option) => ({
              value: option.valor,
              label: option.label,
            }))}
          />
          <CompactPickerField
            label="Encarregado *"
            items={members.data?.items ?? []}
            selected={value.encarregadoId ? [value.encarregadoId] : []}
            loading={members.isLoading}
            onChange={(ids) => setValue({ ...value, encarregadoId: ids.at(-1) ?? '' })}
            single
          />
          <CompactPickerField
            label="Clientes *"
            items={clients.data?.items ?? []}
            selected={[value.clientePrincipalId, ...(value.outrosClienteIds ?? [])].filter(Boolean)}
            loading={clients.isLoading}
            onChange={(ids) =>
              setValue({
                ...value,
                clientePrincipalId: ids[0] ?? '',
                outrosClienteIds: ids.slice(1),
              })
            }
          />
          <CompactPickerField
            label="Partes contrárias"
            items={clients.data?.items ?? []}
            loading={clients.isLoading}
            selected={[
              value.parteContrariaPrincipalId ?? '',
              ...(value.outrasPartesContrariasIds ?? []),
            ].filter(Boolean)}
            onChange={(ids) =>
              setValue({
                ...value,
                parteContrariaPrincipalId: ids[0] ?? null,
                outrasPartesContrariasIds: ids.slice(1),
              })
            }
          />
          <CompactPickerField
            label="Interessados"
            items={clients.data?.items ?? []}
            loading={clients.isLoading}
            selected={value.interessadoIds ?? []}
            onChange={(interessadoIds) => setValue({ ...value, interessadoIds })}
          />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="lf-notes">Anotações</Label>
            <textarea
              id="lf-notes"
              className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
              value={value.observacoes ?? ''}
              maxLength={50000}
              onChange={(e) => setValue({ ...value, observacoes: e.target.value })}
            />
            <p className="text-right text-xs text-muted-foreground">
              {value.observacoes?.length ?? 0} / 50.000 caracteres
            </p>
          </div>
          <fieldset className="grid gap-4 sm:col-span-2 md:grid-cols-2 lg:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">Campos extras</legend>
            {(options.data?.camposExtras ?? [])
              .filter((field) => field.ativo)
              .sort((a, b) => a.ordem - b.ordem)
              .map((field) => (
                <ExtraFieldInput
                  key={field.id}
                  field={field}
                  value={value.camposExtrasValores?.[field.chave] ?? field.valorPadrao ?? ''}
                  onChange={(next) =>
                    setValue({
                      ...value,
                      camposExtrasValores: { ...value.camposExtrasValores, [field.chave]: next },
                    })
                  }
                />
              ))}
          </fieldset>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={
              !value.assunto ||
              !value.categoria ||
              !value.situacao ||
              !value.clientePrincipalId ||
              !value.encarregadoId ||
              missingRequiredExtra
            }
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

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExtraFieldInput({
  field,
  value,
  onChange,
}: {
  field: ExtraFieldDTO;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = `${field.nome}${field.obrigatorio ? ' *' : ''}`;
  if (field.tipo === 'SELECT' || field.tipo === 'BOOLEANO') {
    const options =
      field.tipo === 'BOOLEANO'
        ? [
            { value: 'true', label: 'Sim' },
            { value: 'false', label: 'Não' },
          ]
        : field.opcoes.map((option) => ({ value: option, label: option }));
    return <SelectField label={label} value={value} onChange={onChange} options={options} />;
  }
  if (field.tipo === 'TEXTAREA') {
    return (
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <Label htmlFor={`extra-${field.id}`}>{label}</Label>
        <textarea
          id={`extra-${field.id}`}
          className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
          maxLength={10000}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.length} / 10.000 caracteres
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={`extra-${field.id}`}>{label}</Label>
      <Input
        id={`extra-${field.id}`}
        type={field.tipo === 'DATA' ? 'date' : field.tipo === 'NUMERO' ? 'number' : 'text'}
        step={field.tipo === 'NUMERO' ? '1' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CompactPickerField({
  label,
  items,
  selected,
  onChange,
  loading,
  single = false,
}: {
  label: string;
  items: Array<{ id: string; nome: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  single?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <CompactPicker
        ariaLabel={label}
        placeholder={`Selecione ${label.replace(' *', '').toLocaleLowerCase('pt-BR')}...`}
        items={items}
        selected={selected}
        onChange={onChange}
        loading={loading}
        single={single}
      />
    </div>
  );
}

function CompactPicker({
  ariaLabel,
  placeholder,
  items,
  selected,
  onChange,
  loading = false,
  single = false,
  disabled = false,
}: {
  ariaLabel: string;
  placeholder: string;
  items: Array<{ id: string; nome: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  single?: boolean;
  disabled?: boolean;
}) {
  const [search, setSearch] = React.useState('');
  const visible = items.filter((item) =>
    item.nome.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')),
  );
  const selectedNames = selected
    .map((id) => items.find((item) => item.id === id)?.nome)
    .filter(Boolean) as string[];
  const summary = selectedNames.length
    ? `${selectedNames[0]}${selectedNames.length > 1 ? ` +${selectedNames.length - 1}` : ''}`
    : placeholder;
  return (
    <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className="w-full min-w-0 justify-between font-normal"
          aria-label={ariaLabel}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64">
        <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar..."
            aria-label={`Pesquisar ${ariaLabel}`}
          />
        </div>
        <div className="scrollbar-fade max-h-56 overflow-y-auto">
          {loading ? (
            <DropdownMenuItem disabled>
              <Loader2 className="size-4 animate-spin" /> Carregando...
            </DropdownMenuItem>
          ) : visible.length ? (
            visible.map((item) => (
              <DropdownMenuCheckboxItem
                key={item.id}
                checked={selected.includes(item.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? single
                        ? [item.id]
                        : [...selected.filter((id) => id !== item.id), item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              >
                {item.nome}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <DropdownMenuItem disabled>Nenhum resultado.</DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
