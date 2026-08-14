'use client';

import * as React from 'react';
import { FileWarning } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { documentsApi } from '../api/documents.api';
import { previewKind } from '../domain/file-meta';
import { FileBadge } from './file-badge';

/**
 * Preview real quando possível (PDF/imagem/txt/markdown) — reafirma Sprint
 * 09 ("nunca forçar download"). Demais extensões: card elegante com ícone e
 * ação de download, nunca uma tela vazia. Markdown é exibido como texto
 * simples monoespaçado (sem renderizador dedicado nesta rodada — nenhuma
 * nova dependência de UI foi adicionada só para isto).
 */
export function DocumentPreview({
  documentId,
  extensao,
  nome,
  statusAntivirus,
}: {
  documentId: string;
  extensao: string;
  nome: string;
  statusAntivirus: 'PENDENTE' | 'LIMPO' | 'INFECTADO' | 'ERRO';
}) {
  const kind = previewKind(extensao);
  const [state, setState] = React.useState<{ status: 'loading' | 'ready' | 'error'; url?: string; texto?: string }>({
    status: 'loading',
  });

  React.useEffect(() => {
    if (statusAntivirus === 'INFECTADO') {
      setState({ status: 'error' });
      return;
    }
    if (kind === 'none') {
      setState({ status: 'ready' });
      return;
    }

    let active = true;
    documentsApi
      .preview(documentId)
      .then(async ({ url }) => {
        if (!active) return;
        if (kind === 'text') {
          const response = await fetch(url);
          const texto = await response.text();
          if (active) setState({ status: 'ready', url, texto });
        } else {
          setState({ status: 'ready', url });
        }
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [documentId, kind, statusAntivirus]);

  if (statusAntivirus === 'INFECTADO') {
    return (
      <ErrorState
        title="Arquivo bloqueado por segurança"
        description="O antivírus identificou uma ameaça neste arquivo. Download e preview foram bloqueados."
      />
    );
  }

  if (state.status === 'loading') {
    return <Skeleton className="h-96 w-full" />;
  }

  if (state.status === 'error') {
    return <ErrorState title="Não foi possível carregar a pré-visualização." />;
  }

  if (kind === 'pdf' && state.url) {
    return (
      <iframe
        src={state.url}
        title={`Pré-visualização de ${nome}`}
        className="h-[70vh] w-full rounded-md border border-border"
      />
    );
  }

  if (kind === 'image' && state.url) {
    // eslint-disable-next-line @next/next/no-img-element -- URL assinada dinâmica, não conhecida em build-time
    return <img src={state.url} alt={nome} className="max-h-[70vh] w-full rounded-md border border-border object-contain" />;
  }

  if (kind === 'text' && state.texto !== undefined) {
    return (
      <pre className="scrollbar-fade max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
        {state.texto}
      </pre>
    );
  }

  return (
    <EmptyState
      icon={FileWarning}
      title="Pré-visualização não disponível para este tipo de arquivo"
      description="Baixe o arquivo para visualizá-lo no seu computador."
      action={<FileBadge extensao={extensao} className="size-12" />}
    />
  );
}
