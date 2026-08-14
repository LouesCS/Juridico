'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFolders } from '@/features/folders/api/queries';
import { useMoveDocument } from '../api/mutations';

const SEM_PASTA = '__sem_pasta__';

export function MoveDocumentDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: folders, isLoading } = useFolders({});
  const moveDocument = useMoveDocument();
  const [pastaId, setPastaId] = React.useState<string>(SEM_PASTA);

  function onConfirm() {
    moveDocument.mutate(
      { id: documentId, input: { pastaId: pastaId === SEM_PASTA ? null : pastaId } },
      {
        onSuccess: () => {
          toast.success('Documento movido.');
          onOpenChange(false);
        },
        onError: () => toast.error('Não foi possível mover o documento.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover documento</DialogTitle>
          <DialogDescription>Escolha a pasta de destino na biblioteca geral.</DialogDescription>
        </DialogHeader>

        <Select value={pastaId} onValueChange={setPastaId} disabled={isLoading}>
          <SelectTrigger aria-label="Pasta de destino">
            <SelectValue placeholder="Selecione uma pasta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_PASTA}>Sem pasta (biblioteca geral)</SelectItem>
            {folders?.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={moveDocument.isPending}>
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
