import { z } from 'zod';

export const deadlineFormSchema = z.object({
  processoId: z.string().min(1, 'Selecione o processo.'),
  titulo: z.string().min(2, 'Informe ao menos 2 caracteres.').max(200),
  descricao: z.string().max(2000).optional().or(z.literal('')),
  tipo: z.enum(['FATAL', 'INTERNO', 'AUDIENCIA', 'REUNIAO', 'TAREFA']),
  dataVencimento: z.string().min(1, 'Informe a data.'),
  horaVencimento: z.string().optional().or(z.literal('')),
  responsavelId: z.string().min(1, 'Selecione o responsável.'),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
});

export type DeadlineFormValues = z.infer<typeof deadlineFormSchema>;

export const DEADLINE_FORM_DEFAULTS: DeadlineFormValues = {
  processoId: '',
  titulo: '',
  descricao: '',
  tipo: 'TAREFA',
  dataVencimento: '',
  horaVencimento: '',
  responsavelId: '',
  prioridade: 'MEDIA',
};
