'use client';

import * as React from 'react';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDocuments } from '../api/queries';
import { DocumentCard } from './document-card';
import { UploadDialog } from './upload-dialog';

/** Reafirma Sprint 09: substitui o placeholder "Documentos" por dados reais, escopados a um processo ou cliente. */
function EntityDocumentsTab({
  processoId,
  clienteId,
  searchLabel,
  emptyDescription,
}: {
  processoId?: string;
  clienteId?: string;
  searchLabel: string;
  emptyDescription: string;
}) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isError, refetch } = useDocuments({
    processoId,
    clienteId,
    q: debouncedSearch || undefined,
    sort: '-atualizadoEm',
    limit: 12,
  });
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar documentos"
            aria-label={searchLabel}
            className="pl-8"
          />
        </div>
        <UploadDialog processoId={processoId} clienteId={clienteId} />
      </div>

      {isError && <ErrorState title="Não foi possível carregar os documentos." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Nenhum documento ainda"
          description={emptyDescription}
          action={<UploadDialog processoId={processoId} clienteId={clienteId} />}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CaseDocumentsTab({ processoId }: { processoId: string }) {
  return (
    <EntityDocumentsTab
      processoId={processoId}
      searchLabel="Buscar documentos deste processo"
      emptyDescription="Envie o primeiro documento deste processo."
    />
  );
}

export function ClientDocumentsTab({ clienteId }: { clienteId: string }) {
  return (
    <EntityDocumentsTab
      clienteId={clienteId}
      searchLabel="Buscar documentos deste cliente"
      emptyDescription="Envie o primeiro documento deste cliente."
    />
  );
}
