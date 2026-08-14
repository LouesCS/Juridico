import { z } from 'zod';
import { TASK_RECURRENCE_FREQUENCIES } from '../api/tasks.api';

const NONE = '__none__';

export const taskFormSchema = z.object({
  titulo: z.string().min(2, 'Informe ao menos 2 caracteres.').max(200),
  descricao: z.string().max(4000).optional().or(z.literal('')),
  categoriaId: z.string(),
  statusId: z.string(),
  prioridadeId: z.string(),
  responsavelPrincipalId: z.string(),
  grupoColaboradoresId: z.string(),
  dataInicio: z.string().optional().or(z.literal('')),
  dataVencimento: z.string().optional().or(z.literal('')),
  checklistTexto: z.string().optional().or(z.literal('')),
  recorrenciaAtiva: z.boolean(),
  recorrenciaFrequencia: z.enum(TASK_RECURRENCE_FREQUENCIES),
  recorrenciaRespeitarDiasUteis: z.boolean(),
  recorrenciaDataFim: z.string().optional().or(z.literal('')),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_DEFAULTS: TaskFormValues = {
  titulo: '',
  descricao: '',
  categoriaId: NONE,
  statusId: NONE,
  prioridadeId: NONE,
  responsavelPrincipalId: NONE,
  grupoColaboradoresId: NONE,
  dataInicio: '',
  dataVencimento: '',
  checklistTexto: '',
  recorrenciaAtiva: false,
  recorrenciaFrequencia: 'SEMANAL',
  recorrenciaRespeitarDiasUteis: false,
  recorrenciaDataFim: '',
};

export { NONE as TASK_FORM_NONE_VALUE };
