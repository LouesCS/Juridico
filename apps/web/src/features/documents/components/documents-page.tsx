'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid3x3, HardDrive, LayoutList, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { FolderTree } from '@/features/folders/components/folder-tree';
import type { DocumentListItemDTO, DocumentView } from '../api/documents.api';
import { useDocuments } from '../api/queries';
import { useToggleDocumentFavorite } from '../api/mutations';
import { formatBytes } from '../domain/file-meta';
import { DocumentCard } from './document-card';
import { DocumentRowActions } from './document-row-actions';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FileBadge } from './file-badge';
import { UploadDialog } from './upload-dialog';

const VIEWS: Array<{ value: DocumentView; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'recentes', label: 'Recentes' },
  { value: 'favoritos', label: 'Favoritos' },
  { value: 'versionados', label: 'Versionados' },
  { value: 'compartilhados', label: 'Compartilhados' },
  { value: 'lixeira', label: 'Lixeira' },
];

function FavoriteCell({ document }: { document: DocumentListItemDTO }) {
  const toggleFavorite = useToggleDocumentFavorite();
  return (
    <FavoriteButton
      favorito={document.favorito}
      onToggle={() => toggleFavorite.mutate(document.id)}
      isPending={toggleFavorite.isPending}
      label={`Favoritar ${document.nome}`}
    />
  );
}

/**
 * Tela principal de Documentos (Sprint 09) — lembra Google Drive/Notion:
 * árvore de pastas + visões (Todos/Recentes/Favoritos/Versionados/
 * Compartilhados/Lixeira) + alternância Lista/Grid + busca instantânea.
 * "Compartilhados" é um placeholder honesto (Portal do Cliente não existe
 * ainda) — a própria API já sinaliza `disponivel:false`.
 */
export function DocumentsPage() {
  // Deep-link de pasta/tag (`?pastaId=`/`?tagId=`) — adicionado na Sprint 10
  // para que resultados de Busca Global (Pastas/Tags) abram esta tela já
  // filtrada, em vez de sempre cair na raiz. Lido só na montagem inicial
  // (mesmo racional do `initialTab` de `legal-case-detail-page.tsx`).
  const searchParams = useSearchParams();
  const [view, setView] = React.useState<DocumentView>('todos');
  const [displayMode, setDisplayMode] = React.useState<'lista' | 'grid'>('grid');
  const [pastaId, setPastaId] = React.useState<string | null>(() => searchParams.get('pastaId'));
  const [tagId] = React.useState<string | null>(() => searchParams.get('tagId'));
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<'-atualizadoEm' | 'nome' | '-tamanhoBytes'>('-atualizadoEm');
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isError, refetch } = useDocuments({
    visao: view,
    pastaId: pastaId ?? undefined,
    tagId: tagId ?? undefined,
    q: debouncedSearch || undefined,
    sort,
    limit: 30,
  });

  const items = data?.items ?? [];
  const columns: DataTableColumn<DocumentListItemDTO>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (doc) => (
        <a href={`/documentos/${doc.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
          <FileBadge extensao={doc.extensao} className="size-8" />
          <span className="truncate font-medium">{doc.nome}</span>
        </a>
      ),
    },
    {
      key: 'processo',
      header: 'Processo',
      render: (doc) => doc.processo?.titulo ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (doc) => doc.cliente?.nome ?? <span className="text-muted-foreground">—</span>,
    },
    { key: 'tamanho', header: 'Tamanho', render: (doc) => formatBytes(doc.tamanhoBytes) },
    { key: 'versao', header: 'Versão', render: (doc) => `v${doc.versaoAtual}` },
    {
      key: 'atualizadoEm',
      header: 'Atualizado em',
      render: (doc) => new Date(doc.atualizadoEm).toLocaleDateString('pt-BR'),
    },
    { key: 'favorito', header: '', render: (doc) => <FavoriteCell document={doc} /> },
    { key: 'acoes', header: '', render: (doc) => <DocumentRowActions document={doc} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Organize, envie e encontre documentos jurídicos em segundos."
        actions={<UploadDialog pastaId={pastaId ?? undefined} />}
      />

      <div className="flex flex-col gap-6 sm:flex-row">
        <FolderTree activeId={pastaId} onSelect={setPastaId} />

        <div className="min-w-0 flex-1 space-y-4">
          <Tabs value={view} onValueChange={(v) => setView(v as DocumentView)}>
            <TabsList className="flex-wrap">
              {VIEWS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar documentos"
                aria-label="Pesquisar documentos"
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="w-44" aria-label="Ordenar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-atualizadoEm">Mais recentes</SelectItem>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="-tamanhoBytes">Maior tamanho</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-border p-0.5">
                <Button
                  variant={displayMode === 'lista' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8"
                  onClick={() => setDisplayMode('lista')}
                  aria-pressed={displayMode === 'lista'}
                  aria-label="Modo lista"
                >
                  <LayoutList className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant={displayMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8"
                  onClick={() => setDisplayMode('grid')}
                  aria-pressed={displayMode === 'grid'}
                  aria-label="Modo grid"
                >
                  <Grid3x3 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          {view === 'compartilhados' && data && !data.disponivel && (
            <EmptyState
              icon={HardDrive}
              title="Compartilhamento externo ainda não disponível"
              description="O Portal do Cliente (compartilhamento com clientes externos) está preparado na arquitetura, mas ainda não foi implementado."
            />
          )}

          {view !== 'compartilhados' && isError && (
            <ErrorState title="Não foi possível carregar os documentos." onRetry={() => refetch()} />
          )}

          {view !== 'compartilhados' && isLoading && displayMode === 'grid' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}

          {view !== 'compartilhados' && !isLoading && !isError && items.length === 0 && (
            <EmptyState
              icon={Search}
              title="Nenhum documento encontrado"
              description="Envie o primeiro documento ou ajuste os filtros de busca."
              action={<UploadDialog pastaId={pastaId ?? undefined} />}
            />
          )}

          {view !== 'compartilhados' && !isError && items.length > 0 && displayMode === 'grid' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}

          {view !== 'compartilhados' && !isError && (items.length > 0 || isLoading) && displayMode === 'lista' && (
            <DataTable columns={columns} data={items} rowKey={(doc) => doc.id} isLoading={isLoading} />
          )}

          {data?.nextCursor && (
            <p className="text-center text-xs text-muted-foreground">
              Mostrando {items.length} documentos — refine os filtros para ver mais.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
