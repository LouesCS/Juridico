'use client';

import * as React from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import type { HolidayDTO } from '../api/configuration.api';
import { useCreateHoliday, useDeleteHoliday, useUpdateHoliday } from '../api/mutations';
import { useHolidays } from '../api/queries';

const TIPO_LABELS: Record<HolidayDTO['tipo'], string> = {
  NACIONAL: 'Nacional',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
  FORENSE: 'Forense',
  PERSONALIZADO: 'Personalizado',
};

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function HolidaysPage() {
  const { data: feriados, isLoading, isError, refetch } = useHolidays();
  const canManage = usePermission('configuration:manage');
  const [deleteTarget, setDeleteTarget] = React.useState<HolidayDTO | null>(null);
  const deleteHoliday = useDeleteHoliday();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <HolidayDialog mode="create" />}</div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !feriados || feriados.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum feriado cadastrado"
          description="Feriados deste escritório — use para calcular prazos em dias úteis no futuro."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Recorrente anual</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {feriados.map((feriado) => (
              <TableRow key={feriado.id}>
                <TableCell className="font-medium">{feriado.nome}</TableCell>
                <TableCell>{formatDate(feriado.data)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{TIPO_LABELS[feriado.tipo]}</Badge>
                </TableCell>
                <TableCell>{feriado.recorrenteAnual ? 'Sim' : 'Não'}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <HolidayDialog mode="edit" holiday={feriado} />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Excluir ${feriado.nome}`}
                        onClick={() => setDeleteTarget(feriado)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir feriado"
          description={`"${deleteTarget.nome}" será removido do calendário deste escritório.`}
          confirmLabel="Excluir"
          loading={deleteHoliday.isPending}
          onConfirm={() =>
            deleteHoliday.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Feriado excluído.');
                setDeleteTarget(null);
              },
              onError: () => toast.error('Não foi possível excluir o feriado.'),
            })
          }
        />
      )}
    </div>
  );
}

function HolidayDialog({ mode, holiday }: { mode: 'create' | 'edit'; holiday?: HolidayDTO }) {
  const [open, setOpen] = React.useState(false);
  const [nome, setNome] = React.useState(holiday?.nome ?? '');
  const [data, setData] = React.useState(holiday?.data.slice(0, 10) ?? '');
  const [tipo, setTipo] = React.useState<HolidayDTO['tipo']>(holiday?.tipo ?? 'PERSONALIZADO');
  const [recorrenteAnual, setRecorrenteAnual] = React.useState(holiday?.recorrenteAnual ?? false);

  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const isPending = createHoliday.isPending || updateHoliday.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && mode === 'create') {
      setNome('');
      setData('');
      setTipo('PERSONALIZADO');
      setRecorrenteAnual(false);
    }
  }

  function handleSubmit() {
    if (mode === 'create') {
      createHoliday.mutate(
        { nome, data, tipo, recorrenteAnual },
        {
          onSuccess: () => {
            toast.success(`Feriado "${nome}" criado.`);
            handleOpenChange(false);
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(code === 'DUPLICATE_NAME' ? 'Já existe um feriado com este nome nesta data.' : 'Não foi possível criar o feriado.');
          },
        },
      );
    } else if (holiday) {
      updateHoliday.mutate(
        { id: holiday.id, input: { nome, data, tipo, recorrenteAnual } },
        {
          onSuccess: () => {
            toast.success('Feriado atualizado.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar o feriado.'),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo feriado
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={`Editar ${holiday?.nome}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo feriado' : 'Editar feriado'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="feriado-nome">Nome</Label>
            <Input id="feriado-nome" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feriado-data">Data</Label>
            <Input id="feriado-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as HolidayDTO['tipo'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="feriado-recorrente"
              checked={recorrenteAnual}
              onCheckedChange={(checked) => setRecorrenteAnual(checked === true)}
            />
            <Label htmlFor="feriado-recorrente" className="font-normal">
              Recorrente todo ano
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!nome.trim() || !data}>
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
