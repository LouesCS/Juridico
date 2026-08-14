'use client';

import { Download, History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { documentsApi } from '../api/documents.api';
import { useDocumentVersions } from '../api/queries';
import { formatBytes } from '../domain/file-meta';

async function downloadVersion(documentId: string, versaoId: string) {
  try {
    const { url } = await documentsApi.downloadVersion(documentId, versaoId);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    toast.error('Não foi possível baixar esta versão.');
  }
}

/**
 * Histórico de versões (Sprint 09) — versão atual, anteriores, autor, data/
 * hora, observações, download por versão. "Comparação" preparada para
 * integração futura (nenhum diff real de conteúdo é feito nesta rodada —
 * documentado, não simulado).
 */
export function VersionHistory({ documentId }: { documentId: string }) {
  const { data: versions, isLoading, isError, refetch } = useDocumentVersions(documentId);

  if (isError) return <ErrorState title="Não foi possível carregar as versões." onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return <EmptyState icon={History} title="Nenhuma versão encontrada" />;
  }

  return (
    <ul className="space-y-2">
      {versions.map((version) => (
        <li key={version.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Versão {version.numero}</p>
              {version.vigente && <Badge variant="secondary">Atual</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {version.autor?.nome ?? 'Sistema'} · {new Date(version.criadoEm).toLocaleString('pt-BR')} ·{' '}
              {formatBytes(version.tamanhoBytes)}
            </p>
            {version.comentarioVersao && (
              <p className="text-xs text-muted-foreground italic">&ldquo;{version.comentarioVersao}&rdquo;</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => void downloadVersion(documentId, version.id)}
            aria-label={`Baixar versão ${version.numero}`}
          >
            <Download className="size-4" aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
