'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, Download, Eye, FolderInput, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocumentListItemDTO } from '../api/documents.api';
import { documentsApi } from '../api/documents.api';
import { useDeleteDocument, useDuplicateDocument, useRestoreDocument } from '../api/mutations';
import { MoveDocumentDialog } from './move-document-dialog';

async function openDownload(id: string) {
  try {
    const { url } = await documentsApi.download(id);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    toast.error('Não foi possível gerar o link de download.');
  }
}

export function DocumentRowActions({ document }: { document: DocumentListItemDTO }) {
  const [moveOpen, setMoveOpen] = React.useState(false);
  const deleteDocument = useDeleteDocument();
  const restoreDocument = useRestoreDocument();
  const duplicateDocument = useDuplicateDocument();
  const isTrashed = Boolean(document.excluidoEm);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">Ações de {document.nome}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {!isTrashed && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/documentos/${document.id}`}>
                  <Eye className="size-4" aria-hidden="true" /> Ver detalhes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void openDownload(document.id)}>
                <Download className="size-4" aria-hidden="true" /> Baixar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
                <FolderInput className="size-4" aria-hidden="true" /> Mover
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  duplicateDocument.mutate(document.id, {
                    onSuccess: () => toast.success('Documento duplicado.'),
                    onError: () => toast.error('Não foi possível duplicar.'),
                  })
                }
              >
                <Copy className="size-4" aria-hidden="true" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  deleteDocument.mutate(document.id, {
                    onSuccess: () => toast.success('Documento movido para a lixeira.'),
                    onError: () => toast.error('Não foi possível excluir.'),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden="true" /> Excluir
              </DropdownMenuItem>
            </>
          )}
          {isTrashed && (
            <DropdownMenuItem
              onSelect={() =>
                restoreDocument.mutate(document.id, {
                  onSuccess: () => toast.success('Documento restaurado.'),
                  onError: () => toast.error('Não foi possível restaurar.'),
                })
              }
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Restaurar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <MoveDocumentDialog documentId={document.id} open={moveOpen} onOpenChange={setMoveOpen} />
    </>
  );
}
