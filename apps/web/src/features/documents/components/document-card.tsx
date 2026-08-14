'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DocumentListItemDTO } from '../api/documents.api';
import { useToggleDocumentFavorite } from '../api/mutations';
import { formatBytes } from '../domain/file-meta';
import { DocumentRowActions } from './document-row-actions';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FileBadge } from './file-badge';

export function DocumentCard({ document }: { document: DocumentListItemDTO }) {
  const toggleFavorite = useToggleDocumentFavorite();

  return (
    <Card className="group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-elevation-2">
      <div className="flex items-start justify-between gap-2">
        <FileBadge extensao={document.extensao} className="size-11" />
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <FavoriteButton
            favorito={document.favorito}
            onToggle={() => toggleFavorite.mutate(document.id)}
            isPending={toggleFavorite.isPending}
            label={`Favoritar ${document.nome}`}
          />
          <DocumentRowActions document={document} />
        </div>
      </div>

      <Link href={`/documentos/${document.id}`} className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium hover:underline">{document.nome}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(document.tamanhoBytes)} · v{document.versaoAtual}
          {document.totalVersoes > 1 && ` (${document.totalVersoes} versões)`}
        </p>
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {document.processo && (
          <Badge variant="outline" className="max-w-full truncate">
            {document.processo.titulo}
          </Badge>
        )}
        {document.confidencialidade === 'CONFIDENCIAL' && <Badge variant="destructive">Confidencial</Badge>}
        {document.tags.slice(0, 2).map((tag) => (
          <Badge key={tag.id} variant="secondary">
            {tag.nome}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
