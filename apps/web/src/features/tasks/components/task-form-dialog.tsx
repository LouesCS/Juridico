'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollaboratorGroups, useTaskCategories } from '@/features/configuration/api/queries';
import { useMembers } from '@/features/team';
import { useCreateTask, useUpdateTask } from '../api/mutations';
import { useTaskConfig } from '../api/queries';
import type { CreateTaskInput, TaskDetailDTO, TaskLinkType, TaskRecurrenceFrequency } from '../api/tasks.api';
import {
  TASK_FORM_DEFAULTS,
  TASK_FORM_NONE_VALUE,
  taskFormSchema,
  type TaskFormValues,
} from '../schemas/task-form.schemas';

const RECURRENCE_LABEL: Record<TaskRecurrenceFrequency, string> = {
  DIARIA: 'Diariamente',
  SEMANAL: 'Semanalmente',
  MENSAL: 'Mensalmente',
  ANUAL: 'Anualmente',
  DIAS_UTEIS: 'A cada dia útil',
  DIAS_ESPECIFICOS: 'Em dias específicos da semana',
};

function toDefaults(task?: TaskDetailDTO): TaskFormValues {
  if (!task) return TASK_FORM_DEFAULTS;
  return {
    ...TASK_FORM_DEFAULTS,
    titulo: task.titulo,
    descricao: task.descricao ?? '',
    categoriaId: task.categoria?.id ?? TASK_FORM_NONE_VALUE,
    statusId: task.status?.id ?? TASK_FORM_NONE_VALUE,
    prioridadeId: task.prioridade?.id ?? TASK_FORM_NONE_VALUE,
    responsavelPrincipalId: task.responsavel?.id ?? TASK_FORM_NONE_VALUE,
    grupoColaboradoresId: task.grupoColaboradoresId ?? TASK_FORM_NONE_VALUE,
    dataInicio: task.dataInicio ? task.dataInicio.slice(0, 10) : '',
    dataVencimento: task.dataVencimento ? task.dataVencimento.slice(0, 10) : '',
  };
}

/**
 * Diálogo único para criar e editar Tarefa — checklist rápido (um item por
 * linha, mesma UX de `configuration/task-templates-page.tsx`) e recorrência
 * só aparecem no modo criação, porque `PATCH /tasks/:id` (edição) não
 * aceita esses campos (ver `updateTaskSchema`, backend) — mudar checklist
 * depois da criação é feito na aba "Checklist" da página de detalhe.
 */
export function TaskFormDialog({
  mode,
  task,
  fixedResponsavelId,
  fixedStatusId,
  fixedVinculo,
  fixedVinculos,
  trigger,
}: {
  mode: 'create' | 'edit';
  task?: TaskDetailDTO;
  fixedResponsavelId?: string;
  /** Usado pelo botão "+" de cada coluna do Kanban — a tarefa já nasce na coluna clicada. */
  fixedStatusId?: string;
  /** Usado pelas Ações Rápidas de Cliente/Processo — a tarefa já nasce vinculada. */
  fixedVinculo?: { tipoRecurso: TaskLinkType; recursoId: string };
  fixedVinculos?: Array<{ tipoRecurso: TaskLinkType; recursoId: string; label: string }>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { data: config } = useTaskConfig();
  const { data: categorias } = useTaskCategories();
  const { data: grupos } = useCollaboratorGroups();
  const { data: members } = useMembers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isPending = createTask.isPending || updateTask.isPending;
  const contextLinks = fixedVinculos ?? (fixedVinculo ? [{ ...fixedVinculo, label: 'Recurso relacionado' }] : []);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      ...toDefaults(task),
      responsavelPrincipalId:
        mode === 'create' && fixedResponsavelId ? fixedResponsavelId : toDefaults(task).responsavelPrincipalId,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        ...toDefaults(task),
        responsavelPrincipalId:
          mode === 'create' && fixedResponsavelId ? fixedResponsavelId : toDefaults(task).responsavelPrincipalId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const recorrenciaAtiva = form.watch('recorrenciaAtiva');

  function resolveId(value: string): string | undefined {
    return value === TASK_FORM_NONE_VALUE || !value ? undefined : value;
  }

  function onSubmit(values: TaskFormValues) {
    if (mode === 'edit' && task) {
      updateTask.mutate(
        {
          tarefaId: task.id,
          input: {
            titulo: values.titulo,
            descricao: values.descricao || undefined,
            categoriaId: resolveId(values.categoriaId) ?? null,
            statusId: resolveId(values.statusId) ?? null,
            prioridadeId: resolveId(values.prioridadeId) ?? null,
            responsavelPrincipalId: resolveId(values.responsavelPrincipalId) ?? null,
            grupoColaboradoresId: resolveId(values.grupoColaboradoresId) ?? null,
            dataInicio: values.dataInicio || null,
            dataVencimento: values.dataVencimento || null,
          },
        },
        {
          onSuccess: () => {
            toast.success('Tarefa atualizada.');
            setOpen(false);
          },
          onError: () => toast.error('Não foi possível atualizar a tarefa.'),
        },
      );
      return;
    }

    const checklist = (values.checklistTexto ?? '')
      .split('\n')
      .map((titulo) => titulo.trim())
      .filter(Boolean)
      .map((titulo, ordem) => ({ titulo, obrigatorio: false, ordem }));

    const input: CreateTaskInput = {
      titulo: values.titulo,
      descricao: values.descricao || undefined,
      categoriaId: resolveId(values.categoriaId),
      statusId: resolveId(values.statusId) ?? fixedStatusId,
      prioridadeId: resolveId(values.prioridadeId),
      responsavelPrincipalId: resolveId(values.responsavelPrincipalId),
      grupoColaboradoresId: resolveId(values.grupoColaboradoresId),
      dataInicio: values.dataInicio || undefined,
      dataVencimento: values.dataVencimento || undefined,
      checklist,
      vinculos: contextLinks.length
        ? contextLinks.map(({ tipoRecurso, recursoId }) => ({ tipoRecurso, recursoId }))
        : undefined,
      recorrencia: values.recorrenciaAtiva
        ? {
            frequencia: values.recorrenciaFrequencia,
            respeitarDiasUteis: values.recorrenciaRespeitarDiasUteis,
            dataFim: values.recorrenciaDataFim || undefined,
          }
        : undefined,
    };

    createTask.mutate(input, {
      onSuccess: () => {
        toast.success('Tarefa criada.');
        setOpen(false);
      },
      onError: () => toast.error('Não foi possível criar a tarefa.'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            {mode === 'create' ? (
              <>
                <Plus className="size-4" aria-hidden="true" />
                Nova tarefa
              </>
            ) : (
              <>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="scrollbar-fade max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova tarefa' : 'Editar tarefa'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Status e prioridade seguem os Conjuntos de Valores configurados para o escritório.'
              : 'Altere os dados principais da tarefa.'}
          </DialogDescription>
        </DialogHeader>
        {mode === 'create' && contextLinks.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-sm font-medium">Vínculos</p>
            <div className="flex flex-wrap gap-2">
              {contextLinks.map((link) => (
                <span key={`${link.tipoRecurso}-${link.recursoId}`} className="rounded-md border bg-background px-2 py-1 text-sm">
                  {link.label}
                </span>
              ))}
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex.: Protocolar contestação" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoriaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TASK_FORM_NONE_VALUE}>Sem categoria</SelectItem>
                        {(categorias ?? []).map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nome}
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
                name="prioridadeId"
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
                        <SelectItem value={TASK_FORM_NONE_VALUE}>Padrão</SelectItem>
                        {(config?.prioridade ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.valor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'edit' && (
              <FormField
                control={form.control}
                name="statusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TASK_FORM_NONE_VALUE}>Padrão</SelectItem>
                        {(config?.status ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.valor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsavelPrincipalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TASK_FORM_NONE_VALUE}>Sem responsável</SelectItem>
                        {(members ?? [])
                          .filter((m) => m.status === 'ATIVO')
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
                name="grupoColaboradoresId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo de colaboradores</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TASK_FORM_NONE_VALUE}>Nenhum</SelectItem>
                        {(grupos ?? []).map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id}>
                            {grupo.nome}
                          </SelectItem>
                        ))}
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
                name="dataInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de vencimento (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'create' && (
              <>
                <FormField
                  control={form.control}
                  name="checklistTexto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checklist inicial (opcional, um item por linha)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recorrenciaAtiva"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">Repetir esta tarefa</FormLabel>
                    </FormItem>
                  )}
                />

                {recorrenciaAtiva && (
                  <div className="space-y-4 rounded-md border border-border p-3">
                    <FormField
                      control={form.control}
                      name="recorrenciaFrequencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequência</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
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
                      name="recorrenciaRespeitarDiasUteis"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Pular fins de semana e feriados</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recorrenciaDataFim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repetir até (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isPending}>
                {mode === 'create' ? 'Criar tarefa' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
