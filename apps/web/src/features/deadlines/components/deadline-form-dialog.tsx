'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMembers } from '@/features/team';
import { useLegalCases } from '@/features/legal-cases/api/queries';
import { useCreateDeadline } from '../api/mutations';
import { DEADLINE_FORM_DEFAULTS, deadlineFormSchema, type DeadlineFormValues } from '../schemas/deadline.schemas';

const TIPO_LABEL: Record<DeadlineFormValues['tipo'], string> = {
  FATAL: 'Fatal',
  INTERNO: 'Interno',
  AUDIENCIA: 'Audiência',
  REUNIAO: 'Reunião',
  TAREFA: 'Tarefa',
};

export function DeadlineFormDialog({
  fixedProcessoId,
  trigger,
}: {
  fixedProcessoId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const createDeadline = useCreateDeadline();
  const { data: legalCases } = useLegalCases({ limit: 100, sort: '-ultimaAtualizacaoEm' });
  const { data: members } = useMembers();
  const form = useForm<DeadlineFormValues>({
    resolver: zodResolver(deadlineFormSchema),
    defaultValues: { ...DEADLINE_FORM_DEFAULTS, processoId: fixedProcessoId ?? '' },
  });

  React.useEffect(() => {
    if (open) form.reset({ ...DEADLINE_FORM_DEFAULTS, processoId: fixedProcessoId ?? '' });
  }, [open, fixedProcessoId, form]);

  function onSubmit(values: DeadlineFormValues) {
    createDeadline.mutate(
      {
        processoId: values.processoId,
        input: {
          titulo: values.titulo,
          descricao: values.descricao || undefined,
          tipo: values.tipo,
          dataVencimento: values.dataVencimento,
          horaVencimento: values.horaVencimento || undefined,
          responsavelId: values.responsavelId,
          prioridade: values.prioridade,
        },
      },
      {
        onSuccess: () => {
          toast.success('Prazo cadastrado.');
          setOpen(false);
        },
        onError: () => toast.error('Não foi possível cadastrar o prazo. Tente novamente.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo prazo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="scrollbar-fade max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo prazo</DialogTitle>
          <DialogDescription>Cadastre um prazo, audiência ou tarefa vinculada a um processo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {!fixedProcessoId && (
              <FormField
                control={form.control}
                name="processoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {legalCases?.items.map((legalCase) => (
                          <SelectItem key={legalCase.id} value={legalCase.id}>
                            {legalCase.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex.: Audiência de conciliação" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dataVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="responsavelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members
                        ?.filter((m) => m.status === 'ATIVO')
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.usuario.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createDeadline.isPending}>
                Cadastrar prazo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
