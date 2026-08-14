'use client';

import * as React from 'react';
import { CheckCircle2, RotateCw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { documentsApi } from '../api/documents.api';
import { useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { documentsKeys } from '../api/keys';
import { computeSha256, uploadFileToStorage, type UploadHandle } from '../api/upload-to-storage';
import { FileBadge } from './file-badge';
import { formatBytes } from '../domain/file-meta';

const TAMANHO_MAXIMO_BYTES = 100 * 1024 * 1024;
const EXTENSOES_BLOQUEADAS = new Set(['exe', 'bat', 'sh', 'msi', 'com']);

interface QueueItem {
  id: string;
  file: File;
  status: 'pendente' | 'enviando' | 'confirmando' | 'concluido' | 'erro' | 'cancelado';
  progress: number;
  error?: string;
  handle?: UploadHandle;
}

function validateFile(file: File): string | null {
  if (file.size > TAMANHO_MAXIMO_BYTES) return 'Arquivo excede 100MB.';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (EXTENSOES_BLOQUEADAS.has(ext)) return 'Tipo de arquivo não suportado.';
  return null;
}

/**
 * Reafirma Sprint 09 — drag-and-drop, upload múltiplo, barra de progresso,
 * cancelar, retry, fila de uploads, indicador de processamento, validação de
 * tamanho/extensão, toast de sucesso/erro. Fluxo real (presign → PUT direto
 * ao storage → confirm), nunca simulado.
 */
export function UploadDialog({
  pastaId,
  processoId,
  clienteId,
  resourceType,
  resourceId,
  trigger,
}: {
  pastaId?: string;
  processoId?: string;
  clienteId?: string;
  resourceType?: 'PASTA_JURIDICA';
  resourceId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: documentsKeys.all(escritorioAtivoId ?? '') });
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function processFile(item: QueueItem) {
    updateItem(item.id, { status: 'enviando', progress: 0, error: undefined });
    try {
      const presigned = await documentsApi.presignUpload({
        nomeArquivo: item.file.name,
        mimeType: item.file.type || 'application/octet-stream',
        tamanhoBytes: item.file.size,
        processoId,
        pastaId,
        clienteId,
        resourceType,
        resourceId,
      });

      const handle = uploadFileToStorage(presigned.uploadUrl, item.file, (progress) =>
        updateItem(item.id, { progress }),
      );
      updateItem(item.id, { handle });

      const [, hash] = await Promise.all([handle.promise, computeSha256(item.file)]);

      updateItem(item.id, { status: 'confirmando' });
      const confirmed = await documentsApi.confirmUpload(presigned.documentoId, hash);

      updateItem(item.id, { status: 'concluido', progress: 100 });
      invalidate();

      if (confirmed.avisoDuplicidade) {
        toast.warning(`"${item.file.name}" parece duplicado de "${confirmed.avisoDuplicidade.nome}".`);
      } else {
        toast.success(`"${item.file.name}" enviado com sucesso.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no upload.';
      updateItem(item.id, { status: message === 'Upload cancelado.' ? 'cancelado' : 'erro', error: message });
      if (message !== 'Upload cancelado.') toast.error(`Falha ao enviar "${item.file.name}".`);
    }
  }

  function enqueueFiles(fileList: FileList | File[]) {
    const novos: QueueItem[] = [];
    for (const file of Array.from(fileList)) {
      const erro = validateFile(file);
      const item: QueueItem = {
        id: crypto.randomUUID(),
        file,
        status: erro ? 'erro' : 'pendente',
        progress: 0,
        error: erro ?? undefined,
      };
      novos.push(item);
      if (erro) toast.error(`"${file.name}": ${erro}`);
    }
    setItems((prev) => [...prev, ...novos]);
    for (const item of novos) {
      if (item.status === 'pendente') void processFile(item);
    }
  }

  function retry(item: QueueItem) {
    void processFile(item);
  }

  function cancel(item: QueueItem) {
    item.handle?.cancel();
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setItems([]);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Upload className="size-4" aria-hidden="true" />
            Enviar documento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar documentos</DialogTitle>
          <DialogDescription>Arraste arquivos ou selecione do seu computador. Até 100MB por arquivo.</DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length) enqueueFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
          )}
        >
          <Upload className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Arraste arquivos aqui</p>
          <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            aria-label="Selecionar arquivos para enviar"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) enqueueFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {items.length > 0 && (
          <ul className="scrollbar-fade mt-4 max-h-64 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <FileBadge extensao={item.file.name.split('.').pop() ?? ''} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                  {(item.status === 'enviando' || item.status === 'confirmando') && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${item.status === 'confirmando' ? 100 : item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'erro' && <p className="text-xs text-destructive">{item.error}</p>}
                </div>
                {item.status === 'concluido' && (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                )}
                {item.status === 'erro' && (
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => retry(item)}>
                    <RotateCw className="size-4" aria-hidden="true" />
                    <span className="sr-only">Tentar novamente</span>
                  </Button>
                )}
                {(item.status === 'enviando' || item.status === 'confirmando') && (
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => cancel(item)}>
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Cancelar</span>
                  </Button>
                )}
                {(item.status === 'concluido' ||
                  item.status === 'erro' ||
                  item.status === 'cancelado') && (
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => remove(item.id)}>
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Remover</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
