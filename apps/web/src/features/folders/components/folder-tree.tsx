'use client';

import * as React from 'react';
import { FolderPlus, Library, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { cn } from '@/lib/utils/cn';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { buildFolderTree } from '../domain/build-tree';
import { useFolders } from '../api/queries';
import { useCreateFolder } from '../api/mutations';
import { FolderTreeItem } from './folder-tree-item';

/**
 * Árvore de pastas (Sprint 09) — inspirada no Google Drive: expandir/
 * recolher, ícones, busca, quantidade de documentos, indicador de pasta
 * ativa. `processoId` deixado de fora nesta rodada (árvore da biblioteca
 * geral do escritório); a mesma árvore aninhada em um processo reaproveita
 * este componente passando `processoId`.
 */
export function FolderTree({
  processoId,
  activeId,
  onSelect,
}: {
  processoId?: string;
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const { data: folders, isLoading, isError, refetch } = useFolders({ processoId, q: debouncedSearch || undefined });
  const createFolder = useCreateFolder();

  function onCreateFolder() {
    const nome = window.prompt('Nome da nova pasta');
    if (!nome?.trim()) return;
    createFolder.mutate(
      { nome: nome.trim(), processoId },
      {
        onSuccess: () => toast.success('Pasta criada.'),
        onError: () => toast.error('Não foi possível criar a pasta.'),
      },
    );
  }

  const tree = React.useMemo(() => buildFolderTree(folders ?? []), [folders]);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pastas</p>
        <Button variant="ghost" size="icon" className="size-7" onClick={onCreateFolder} aria-label="Criar pasta">
          <FolderPlus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pasta"
          aria-label="Buscar pasta"
          className="h-8 pl-8 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/70',
          activeId === null && 'bg-muted font-medium',
        )}
      >
        <Library className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        Todos os documentos
      </button>

      {isError && <ErrorState title="Não foi possível carregar as pastas." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-1.5 px-1">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      )}

      {!isLoading && !isError && tree.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">Nenhuma pasta ainda.</p>
      )}

      {!isLoading && !isError && tree.length > 0 && (
        <ul>
          {tree.map((node) => (
            <FolderTreeItem key={node.id} node={node} depth={0} activeId={activeId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  );
}
