'use client';

import * as React from 'react';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import type { EntidadeConfiguravel, ExtraFieldDTO } from '../api/configuration.api';
import { useCreateExtraField, useDeleteExtraField, useUpdateExtraField } from '../api/mutations';
import { useExtraFields } from '../api/queries';

const ENTIDADE_LABELS: Record<EntidadeConfiguravel, string> = {
  CLIENTE: 'Cliente',
  PROCESSO: 'Processo',
  DOCUMENTO: 'Documento',
  TAREFA: 'Tarefa',
  PASTA_JURIDICA: 'Pasta Jurídica',
  MOVIMENTACAO_EXTRAJUDICIAL: 'Movimentação Extrajudicial',
};
const TIPO_LABELS: Record<ExtraFieldDTO['tipo'], string> = {
  TEXTO: 'Texto',
  NUMERO: 'Número',
  DATA: 'Data',
  BOOLEANO: 'Sim/Não',
  SELECT: 'Seleção única',
  MULTISELECT: 'Seleção múltipla',
  TEXTAREA: 'Texto longo',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function ExtraFieldsPage() {
  const { data: campos, isLoading, isError, refetch } = useExtraFields();
  const canManage = usePermission('configuration:manage');
  const [deleteTarget, setDeleteTarget] = React.useState<ExtraFieldDTO | null>(null);
  const deleteField = useDeleteExtraField();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <ExtraFieldDialog mode="create" />}</div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !campos || campos.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhum campo extra cadastrado"
          description="Campos extras permitem capturar informações adicionais em Clientes, Processos, Documentos e Tarefas."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {campos.map((campo) => (
              <TableRow key={campo.id}>
                <TableCell className="font-medium">{campo.nome}</TableCell>
                <TableCell>{ENTIDADE_LABELS[campo.entidade]}</TableCell>
                <TableCell>{TIPO_LABELS[campo.tipo]}</TableCell>
                <TableCell>{campo.obrigatorio ? 'Sim' : 'Não'}</TableCell>
                <TableCell>
                  <Badge variant={campo.ativo ? 'success' : 'outline'}>
                    {campo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ExtraFieldDialog mode="edit" field={campo} />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Excluir ${campo.nome}`}
                        onClick={() => setDeleteTarget(campo)}
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
          title="Excluir campo extra"
          description={`"${deleteTarget.nome}" será removido — dados já preenchidos com este campo não serão apagados.`}
          confirmLabel="Excluir"
          loading={deleteField.isPending}
          onConfirm={() =>
            deleteField.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success('Campo extra excluído.');
                setDeleteTarget(null);
              },
              onError: () => toast.error('Não foi possível excluir o campo extra.'),
            })
          }
        />
      )}
    </div>
  );
}

function ExtraFieldDialog({ mode, field }: { mode: 'create' | 'edit'; field?: ExtraFieldDTO }) {
  const [open, setOpen] = React.useState(false);
  const [entidade, setEntidade] = React.useState<EntidadeConfiguravel>(
    field?.entidade ?? 'CLIENTE',
  );
  const [nome, setNome] = React.useState(field?.nome ?? '');
  const [chave, setChave] = React.useState(field?.chave ?? '');
  const [chaveEditada, setChaveEditada] = React.useState(false);
  const [tipo, setTipo] = React.useState<ExtraFieldDTO['tipo']>(field?.tipo ?? 'TEXTO');
  const [obrigatorio, setObrigatorio] = React.useState(field?.obrigatorio ?? false);
  const [opcoesTexto, setOpcoesTexto] = React.useState((field?.opcoes ?? []).join(', '));
  const [valorPadrao, setValorPadrao] = React.useState(field?.valorPadrao ?? '');

  const createField = useCreateExtraField();
  const updateField = useUpdateExtraField();
  const isPending = createField.isPending || updateField.isPending;
  const precisaOpcoes = tipo === 'SELECT' || tipo === 'MULTISELECT';

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && mode === 'create') {
      setEntidade('CLIENTE');
      setNome('');
      setChave('');
      setChaveEditada(false);
      setTipo('TEXTO');
      setObrigatorio(false);
      setOpcoesTexto('');
      setValorPadrao('');
    }
  }

  function handleSubmit() {
    const opcoes = opcoesTexto
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (mode === 'create') {
      createField.mutate(
        {
          entidade,
          nome,
          chave,
          tipo,
          obrigatorio,
          opcoes,
          valorPadrao: valorPadrao || null,
          ordem: 0,
        },
        {
          onSuccess: () => {
            toast.success(`Campo "${nome}" criado.`);
            handleOpenChange(false);
          },
          onError: (error) => {
            const code = (error as { code?: string })?.code;
            toast.error(
              code === 'DUPLICATE_NAME'
                ? 'Já existe um campo com esta chave para esta entidade.'
                : 'Não foi possível criar o campo.',
            );
          },
        },
      );
    } else if (field) {
      updateField.mutate(
        {
          id: field.id,
          input: { nome, tipo, obrigatorio, opcoes, valorPadrao: valorPadrao || null },
        },
        {
          onSuccess: () => {
            toast.success('Campo atualizado.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar o campo.'),
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
            Novo campo extra
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={`Editar ${field?.nome}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo campo extra' : 'Editar campo extra'}</DialogTitle>
          <DialogDescription>
            Campos extras aparecem nos formulários da entidade escolhida sem exigir mudança de
            código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Entidade</Label>
            <Select
              value={entidade}
              onValueChange={(v) => setEntidade(v as EntidadeConfiguravel)}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENTIDADE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="campo-nome">Nome</Label>
              <Input
                id="campo-nome"
                value={nome}
                autoFocus
                onChange={(e) => {
                  setNome(e.target.value);
                  if (!chaveEditada) setChave(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campo-chave">Chave (identificador)</Label>
              <Input
                id="campo-chave"
                value={chave}
                disabled={mode === 'edit'}
                onChange={(e) => {
                  setChaveEditada(true);
                  setChave(slugify(e.target.value));
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ExtraFieldDTO['tipo'])}>
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

          {precisaOpcoes && (
            <div className="space-y-1.5">
              <Label htmlFor="campo-opcoes">Opções (separadas por vírgula)</Label>
              <Input
                id="campo-opcoes"
                value={opcoesTexto}
                onChange={(e) => setOpcoesTexto(e.target.value)}
                placeholder="Cível, Trabalhista, Tributário"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="campo-valor-padrao">Valor padrão</Label>
            <Input
              id="campo-valor-padrao"
              value={valorPadrao}
              onChange={(event) => setValorPadrao(event.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="campo-obrigatorio"
              checked={obrigatorio}
              onCheckedChange={(checked) => setObrigatorio(checked === true)}
            />
            <Label htmlFor="campo-obrigatorio" className="font-normal">
              Obrigatório
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isPending}
            disabled={!nome.trim() || !chave.trim() || (precisaOpcoes && !opcoesTexto.trim())}
          >
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
