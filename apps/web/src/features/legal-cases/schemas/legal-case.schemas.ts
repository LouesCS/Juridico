import { z } from 'zod';
import { isValidCnj } from '@/lib/validators/cnj';

/** Reafirma docs/api/18-dtos.md §18.5 — mesmas regras do backend. */
export const legalCaseFormSchema = z.object({
  titulo: z.string().min(3, 'Informe ao menos 3 caracteres.').max(200),
  clienteId: z.string().min(1, 'Selecione o cliente.'),
  responsavelPrincipalId: z.string().min(1, 'Selecione o advogado responsável.'),
  area: z.string().min(1, 'Informe a área.').max(60),
  numeroCnj: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isValidCnj(v), 'Número CNJ inválido (dígito verificador não confere).'),
  tipo: z.enum(['JUDICIAL', 'ADMINISTRATIVO', 'CONSULTIVO', 'EXTRAJUDICIAL']),
  poloCliente: z.enum(['ATIVO', 'PASSIVO', 'TERCEIRO'], {
    message: 'Selecione o polo do cliente.',
  }),
  tribunal: z.string().max(100).optional().or(z.literal('')),
  comarca: z.string().max(100).optional().or(z.literal('')),
  vara: z.string().max(100).optional().or(z.literal('')),
  uf: z.string().max(2).optional().or(z.literal('')),
  instancia: z.enum(['PRIMEIRA', 'SEGUNDA', 'SUPERIOR']).optional().or(z.literal('')),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
  status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO']),
  segredoJustica: z.boolean(),
  valorCausa: z.string().optional().or(z.literal('')),
  descricao: z.string().max(4000).optional().or(z.literal('')),
  observacoes: z.string().max(4000).optional().or(z.literal('')),
});

export type LegalCaseFormValues = z.infer<typeof legalCaseFormSchema>;

export const LEGAL_CASE_FORM_DEFAULTS: LegalCaseFormValues = {
  titulo: '',
  clienteId: '',
  responsavelPrincipalId: '',
  area: '',
  numeroCnj: '',
  tipo: 'JUDICIAL',
  poloCliente: 'ATIVO',
  tribunal: '',
  comarca: '',
  vara: '',
  uf: '',
  instancia: '',
  prioridade: 'MEDIA',
  status: 'ATIVO',
  segredoJustica: false,
  valorCausa: '',
  descricao: '',
  observacoes: '',
};
