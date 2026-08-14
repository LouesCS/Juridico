'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExtraMovement } from '../api/extrajudicial-movements.api';

export type ExtraMovementEdit = { dataMovimentacao?: string; descricao?: string };

export function ExtrajudicialMovementEditDialog({
  movement,
  onClose,
  onSave,
  loading = false,
}: {
  movement?: ExtraMovement;
  onClose: () => void;
  onSave: (value: ExtraMovementEdit) => void;
  loading?: boolean;
}) {
  const [date, setDate] = React.useState('');
  const [description, setDescription] = React.useState('');
  React.useEffect(() => {
    if (movement) {
      setDate(movement.dataMovimentacao.slice(0, 10));
      setDescription(movement.descricao);
    }
  }, [movement]);
  return (
    <Dialog open={!!movement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar movimentação extrajudicial</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="extra-movement-date">Data da movimentação *</Label>
            <Input
              id="extra-movement-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extra-movement-description">Descrição *</Label>
            <textarea
              id="extra-movement-description"
              className="min-h-72 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            loading={loading}
            disabled={!date || !description.trim()}
            onClick={() =>
              onSave({
                dataMovimentacao: new Date(`${date}T12:00:00.000Z`).toISOString(),
                descricao: description,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
