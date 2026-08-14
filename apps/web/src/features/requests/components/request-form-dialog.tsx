'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOffice } from '@/features/office';
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { requestsApi, type RequestDTO } from '../api/requests.api';
import { requestKeys } from '../api/queries';
import { CurrencyInput } from './currency-input';
import { REQUEST_STATUS_OPTIONS, requestStatusLabel } from '../domain/request-status';

type Process = { id: string; titulo: string; numeroCnj?: string | null; tipo: string };
const NONE = 'NONE';
const processLabel = (process: Process) =>
  process.tipo === 'JUDICIAL' && process.numeroCnj
    ? `CNJ ${process.numeroCnj} — ${process.titulo}`
    : process.titulo;

export function RequestFormDialog({
  pasta,
  processos,
  request,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  pasta: { id: string; nome: string };
  processos: Process[];
  request?: RequestDTO;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const { escritorioAtivoId } = useOffice();
  const queryClient = useQueryClient();
  const options = useQuery({
    queryKey: ['request-options', escritorioAtivoId],
    queryFn: requestsApi.options,
    enabled: open,
  });
  const folder = useQuery({
    queryKey: ['legal-folder', pasta.id, 'request-form'],
    queryFn: () => legalFoldersApi.get(pasta.id),
    enabled: open,
  });
  const availableProcesses = folder.data?.processos.map((item) => item.processo) ?? processos;
  const judicialProcesses = availableProcesses.filter((process) => process.tipo === 'JUDICIAL');
  const extrajudicialProcesses = availableProcesses.filter(
    (process) => process.tipo === 'EXTRAJUDICIAL',
  );
  const initial = React.useCallback(
    () => ({
      descricao: request?.descricao ?? '',
      categoria: request?.categoria ?? '',
      situacao: request?.situacao ?? 'EM_ANDAMENTO',
      processoId: request?.processo?.id ?? NONE,
      dataFinalizacao: request?.dataFinalizacao?.slice(0, 10) ?? '',
      estimativaExito: request?.estimativaExito ?? '',
      valorPedido: request?.valorPedidoCentavos ?? '',
      valorProvavel: request?.valorProvavelCentavos ?? '',
      valorPossivel: request?.valorPossivelCentavos ?? '',
      valorRemoto: request?.valorRemotoCentavos ?? '',
      valorFinal: request?.valorFinalCentavos ?? '',
      anotacoes: request?.anotacoes ?? '',
    }),
    [request],
  );
  const [form, setForm] = React.useState(initial);
  React.useEffect(() => {
    if (open) setForm(initial());
  }, [open, initial]);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        pastaJuridicaId: pasta.id,
        processoId: form.processoId === NONE ? null : form.processoId,
        descricao: form.descricao,
        categoria: form.categoria,
        situacao: form.situacao,
        dataFinalizacao: form.dataFinalizacao || null,
        estimativaExito: form.estimativaExito ? Number(form.estimativaExito) : null,
        valorPedidoCentavos: form.valorPedido || null,
        valorProvavelCentavos: form.valorProvavel || null,
        valorPossivelCentavos: form.valorPossivel || null,
        valorRemotoCentavos: form.valorRemoto || null,
        valorFinalCentavos: form.valorFinal || null,
        anotacoes: form.anotacoes || null,
      };
      return request ? requestsApi.update(request.id, body) : requestsApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all(escritorioAtivoId ?? '') });
      toast.success(request ? 'Pedido atualizado' : 'Pedido criado');
      setOpen(false);
    },
    onError: () => toast.error('Não foi possível salvar o Pedido.'),
  });
  const moneyFields: Array<[keyof typeof form, string]> = [
    ['valorPedido', 'Valor pedido'],
    ['valorRemoto', 'Valor remoto'],
    ['valorPossivel', 'Valor possível'],
    ['valorProvavel', 'Valor provável'],
    ['valorFinal', 'Valor final'],
  ];
  const processSelect = (label: string, list: Process[], selected: boolean) => {
    const selectedItem = selected
      ? list.find((process) => process.id === form.processoId)
      : undefined;
    const selectedLabel = selectedItem ? processLabel(selectedItem) : '';
    const trigger = (
      <SelectTrigger
        aria-label={label}
        className="min-w-0 overflow-hidden [&>span:first-child]:min-w-0 [&>span:first-child]:truncate [&>span:first-child]:whitespace-nowrap"
      >
        <SelectValue placeholder={`Nenhum ${label} nesta Pasta.`} />
      </SelectTrigger>
    );
    return (
      <div className="min-w-0">
        <Label>{label}</Label>
        <Select
          value={selected ? form.processoId : NONE}
          onValueChange={(value) => set('processoId', value)}
          disabled={folder.isLoading || list.length === 0}
        >
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent>{selectedLabel || 'Nenhum Processo selecionado.'}</TooltipContent>
          </Tooltip>
          <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl">
            <SelectItem value={NONE}>Nenhum</SelectItem>
            {list.map((process) => (
              <SelectItem
                key={process.id}
                value={process.id}
                className="break-words whitespace-normal"
              >
                {processLabel(process)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!folder.isLoading && list.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Nenhum {label} nesta Pasta.</p>
        )}
      </div>
    );
  };
  const selectedProcess =
    availableProcesses.find((process) => process.id === form.processoId) ?? request?.processo;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(controlledOpen === undefined || trigger !== undefined) && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm">
              <Plus />
              Novo Pedido
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{request ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <h3 className="text-sm font-semibold sm:col-span-3">Identificação</h3>
          <div className="sm:col-span-3">
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              onChange={(event) => set('descricao', event.target.value)}
              maxLength={300}
            />
          </div>
          {moneyFields.slice(0, 3).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <CurrencyInput
                aria-label={label}
                value={form[key]}
                onValueChange={(value) => set(key, value)}
              />
            </div>
          ))}
          {moneyFields.slice(3).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <CurrencyInput
                aria-label={label}
                value={form[key]}
                onValueChange={(value) => set(key, value)}
              />
            </div>
          ))}
          <div>
            <Label>Estimativa de êxito (%)</Label>
            <Input
              aria-label="Estimativa de êxito"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.estimativaExito}
              onChange={(event) => set('estimativaExito', event.target.value)}
            />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select value={form.categoria} onValueChange={(value) => set('categoria', value)}>
              <SelectTrigger aria-label="Categoria">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.data?.categorias.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Situação</Label>
            <Select value={form.situacao} onValueChange={(value) => set('situacao', value)}>
              <SelectTrigger aria-label="Situação">
                <SelectValue>{requestStatusLabel(form.situacao)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REQUEST_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {requestStatusLabel(option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de finalização</Label>
            <Input
              type="date"
              value={form.dataFinalizacao}
              onChange={(event) => set('dataFinalizacao', event.target.value)}
            />
          </div>
          <div>
            <Label>Pasta *</Label>
            <Input value={pasta.nome} disabled />
          </div>
          {processSelect(
            'Processo judicial',
            judicialProcesses,
            selectedProcess?.tipo === 'JUDICIAL',
          )}
          {processSelect(
            'Processo extrajudicial',
            extrajudicialProcesses,
            selectedProcess?.tipo === 'EXTRAJUDICIAL',
          )}
          <div className="sm:col-span-3">
            <Label>Anotações</Label>
            <Textarea
              value={form.anotacoes}
              maxLength={1000}
              onChange={(event) => set('anotacoes', event.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.anotacoes.length} / 1.000 caracteres
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!form.descricao.trim() || !form.categoria || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
