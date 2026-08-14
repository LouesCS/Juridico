'use client';

import * as React from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { FolderTreeNode } from '../domain/build-tree';
import { useDeleteFolder, useToggleFolderFavorite } from '../api/mutations';

export function FolderTreeItem({
  node,
  depth,
  activeId,
  onSelect,
}: {
  node: FolderTreeNode;
  depth: number;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(depth === 0);
  const isActive = activeId === node.id;
  const hasChildren = node.children.length > 0;
  const toggleFavorite = useToggleFolderFavorite();
  const deleteFolder = useDeleteFolder();

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md py-1 pr-1 text-sm transition-colors hover:bg-muted/70',
          isActive && 'bg-muted font-medium',
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn('flex size-5 shrink-0 items-center justify-center', !hasChildren && 'invisible')}
          aria-label={expanded ? `Recolher ${node.nome}` : `Expandir ${node.nome}`}
          aria-expanded={expanded}
        >
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} aria-hidden="true" />
        </button>

        <button type="button" onClick={() => onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {expanded && hasChildren ? (
            <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{node.nome}</span>
          {node.favorito && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />}
        </button>

        <span className="shrink-0 text-xs text-muted-foreground">{node.totalDocumentos}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Ações de {node.nome}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => toggleFavorite.mutate(node.id)}>
              {node.favorito ? 'Desfavoritar' : 'Favoritar'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() =>
                deleteFolder.mutate(
                  { id: node.id },
                  {
                    onSuccess: () => toast.success('Pasta excluída.'),
                    onError: (error) => {
                      const code = (error as { code?: string })?.code;
                      if (code === 'FOLDER_NOT_EMPTY') {
                        toast.error('Pasta não está vazia — mova ou exclua o conteúdo primeiro.');
                      } else {
                        toast.error('Não foi possível excluir a pasta.');
                      }
                    },
                  },
                )
              }
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <ul className="transition-collapse">
          {node.children.map((child) => (
            <FolderTreeItem key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
