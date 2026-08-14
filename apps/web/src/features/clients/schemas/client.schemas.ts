import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '@/lib/validators/br-documents';

/**
 * Reafirma docs/api/18-dtos.md §18.4 — mesmas regras do backend, validadas
 * também no cliente. Ampliado no Sprint "Clientes e Contatos" —
 * `categoriaRelacionamento`/`avatarUrl`/campos pessoais (só relevantes
 * para Pessoa Física)/`camposExtras` (Configuration Engine, `entidade
 * CLIENTE` — só leitura de metadado consumida aqui, nunca alterada).
 */
export const clientFormSchema = z
  .object({
    tipo: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA'], {
      message: 'Selecione o tipo de cliente.',
    }),
    nome: z.string().min(2, 'Informe ao menos 2 caracteres.').max(120),
    nomeSocial: z.string().max(120).optional().or(z.literal('')),
    razaoSocial: z.string().max(160).optional().or(z.literal('')),
    cpf: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || isValidCpf(v), 'CPF inválido.'),
    cnpj: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || isValidCnpj(v), 'CNPJ inválido.'),
    rg: z.string().max(30).optional().or(z.literal('')),
    avatarUrl: z.string().url('URL inválida.').max(500).optional().or(z.literal('')),
    email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
    emailAdicional: z.string().email('E-mail adicional inválido.').optional().or(z.literal('')),
    telefone: z.string().max(20).optional().or(z.literal('')),
    celular: z.string().max(20).optional().or(z.literal('')),
    telefoneResidencial: z.string().max(20).optional().or(z.literal('')),
    telefoneResponsavel: z.string().max(20).optional().or(z.literal('')),
    enderecoCep: z.string().optional().or(z.literal('')),
    enderecoLogradouro: z.string().max(160).optional().or(z.literal('')),
    enderecoNumero: z.string().max(20).optional().or(z.literal('')),
    enderecoComplemento: z.string().max(80).optional().or(z.literal('')),
    enderecoBairro: z.string().max(80).optional().or(z.literal('')),
    enderecoCidade: z.string().max(80).optional().or(z.literal('')),
    enderecoUf: z.string().max(2).optional().or(z.literal('')),
    observacoes: z.string().max(4000).optional().or(z.literal('')),
    responsavelId: z.string().optional().or(z.literal('')),
    responsavelNome: z.string().max(120).optional().or(z.literal('')),
    nomeMae: z.string().max(120).optional().or(z.literal('')),
    nomePai: z.string().max(120).optional().or(z.literal('')),
    estadoCivil: z
      .enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', ''])
      .optional(),
    profissao: z.string().max(120).optional().or(z.literal('')),
    dataNascimento: z.string().optional().or(z.literal('')),
    camposExtras: z.record(z.string(), z.string()),
  })
  .refine((data) => data.tipo !== 'PESSOA_JURIDICA' || !!data.razaoSocial, {
    message: 'Razão social é obrigatória para Pessoa Jurídica.',
    path: ['razaoSocial'],
  });

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const CLIENT_FORM_DEFAULTS: ClientFormValues = {
  tipo: 'PESSOA_FISICA',
  nome: '',
  nomeSocial: '',
  razaoSocial: '',
  cpf: '',
  cnpj: '',
  rg: '',
  avatarUrl: '',
  email: '',
  emailAdicional: '',
  telefone: '',
  celular: '',
  telefoneResidencial: '',
  telefoneResponsavel: '',
  enderecoCep: '',
  enderecoLogradouro: '',
  enderecoNumero: '',
  enderecoComplemento: '',
  enderecoBairro: '',
  enderecoCidade: '',
  enderecoUf: '',
  observacoes: '',
  responsavelId: '',
  responsavelNome: '',
  nomeMae: '',
  nomePai: '',
  estadoCivil: '',
  profissao: '',
  dataNascimento: '',
  camposExtras: {},
};
