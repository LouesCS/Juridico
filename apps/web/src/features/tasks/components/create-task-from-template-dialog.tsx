'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { useTaskTemplates } from '@/features/configuration/api/queries';
import { useMembers } from '@/features/team';
import { useCreateTaskFromTemplate } from '../api/mutations';

/**
 * "Criar tarefa a partir do modelo" (Prompt 14 §Templates) — consome
 * `ModeloTarefa` (Configuration Engine, Prompt 13) via
 * `configurationApi.listTaskTemplates()`, nunca duplica o cadastro de
 * modelos (isso continua só em `/configuracoes/modelos-tarefa`).
 */
export function CreateTaskFromTemplateDialog() {
  const [open, setOpen] = React.useState(false);
  const [modeloId, setModeloId] = React.useState('');
  const [responsavelPrincipalId, setResponsavelPrincipalId] = React.useState('');
  const [dataVencimento, setDataVencimento] = React.useState('');
  const { data: modelos } = useTaskTemplates();
  const { data: members } = useMembers();
  const createFromTemplate = useCreateTaskFromTemplate();
  const router = useRouter();

  const modelosAtivos = (modelos ?? []).filter((m) => m.ativo);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setModeloId('');
      setResponsavelPrincipalId('');
      setDataVencimento('');
    }
  }

  function handleSubmit() {
    if (!modeloId) return;
    createFromTemplate.mutate(
      {
        modeloId,
        dataVencimento: dataVencimento || undefined,
        responsavelPrincipalId: responsavelPrincipalId || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success('Tarefa criada a partir do modelo.');
          handleOpenChange(false);
          router.push(`/tarefas/${result.id}`);
        },
        onError: () => toast.error('Não foi possível criar a tarefa a partir do modelo.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardCheck className="size-4" aria-hidden="true" />
          A partir de um modelo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar tarefa a partir de um modelo</DialogTitle>
          <DialogDescription>
            Categoria, prioridade, prazo padrão e checklist vêm do modelo selecionado.
          </DialogDescription>
        </DialogHeader>

        {modelosAtivos.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhum modelo ativo"
            description="Cadastre um modelo em Configurações → Modelos de Tarefa para usar aqui."
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelosAtivos.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      {modelo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável (opcional)</Label>
              <Select value={responsavelPrincipalId} onValueChange={setResponsavelPrincipalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {(members ?? [])
                    .filter((m) => m.status === 'ATIVO')
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.usuario.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo-data-vencimento">Data de vencimento (opcional — sobrepõe o prazo padrão do modelo)</Label>
              <Input
                id="modelo-data-vencimento"
                type="date"
                value={dataVencimento}
                onChange={(event) => setDataVencimento(event.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!modeloId || createFromTemplate.isPending} onClick={handleSubmit}>
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
