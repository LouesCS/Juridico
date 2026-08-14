import { z } from 'zod';
import { isValidCpf } from '@/lib/validators/br-documents';

/**
 * Formulário de Colaborador (Sprint "Colaboradores") — mesmo racional de
 * `features/clients/schemas/client.schemas.ts`: um único schema serve
 * criação e edição (a Tab "Acesso ao sistema" só é editável na criação —
 * ver `collaborator-form-dialog.tsx`). Todos os campos pessoais/contato/
 * endereço/profissionais são opcionais no backend; só `nome`/`email` são
 * obrigatórios (contrato `POST /members`).
 */
export const collaboratorFormSchema = z.object({
  nome: z.string().min(2, 'Informe ao menos 2 caracteres.').max(120),
  nomeSocial: z.string().max(120).optional().or(z.literal('')),
  cpf: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isValidCpf(v), 'CPF inválido.'),
  rg: z.string().max(20).optional().or(z.literal('')),
  dataNascimento: z.string().optional().or(z.literal('')),
  estadoCivil: z
    .enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', ''])
    .optional(),
  profissao: z.string().max(120).optional().or(z.literal('')),
  nomeMae: z.string().max(120).optional().or(z.literal('')),
  nomePai: z.string().max(120).optional().or(z.literal('')),
  anotacoes: z.string().max(4000).optional().or(z.literal('')),
  fotoUrl: z.string().url('URL inválida.').max(500).optional().or(z.literal('')),

  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  whatsapp: z.string().max(20).optional().or(z.literal('')),

  enderecoCep: z.string().optional().or(z.literal('')),
  enderecoLogradouro: z.string().max(160).optional().or(z.literal('')),
  enderecoNumero: z.string().max(20).optional().or(z.literal('')),
  enderecoComplemento: z.string().max(80).optional().or(z.literal('')),
  enderecoBairro: z.string().max(80).optional().or(z.literal('')),
  enderecoCidade: z.string().max(80).optional().or(z.literal('')),
  enderecoUf: z.string().max(2).optional().or(z.literal('')),
  enderecoPais: z.string().max(60).optional().or(z.literal('')),

  cargoId: z.string().optional().or(z.literal('')),
  grupoIds: z.array(z.string()),
  departamento: z.string().max(120).optional().or(z.literal('')),
  numeroOab: z.string().max(20).optional().or(z.literal('')),
  ufOab: z.string().max(2).optional().or(z.literal('')),
  situacaoOab: z.string().max(40).optional().or(z.literal('')),
  observacaoOab: z.string().max(1000).optional().or(z.literal('')),
  dataEntrada: z.string().optional().or(z.literal('')),
  responsavelId: z.string().optional().or(z.literal('')),

  // Só usados/validados na criação (`isEditing === false`) — ver
  // `collaborator-form-dialog.tsx`; na edição, acesso é gerenciado pelas
  // ações dedicadas (conceder/revogar), não reeditado aqui.
  comAcesso: z.boolean(),
  papelId: z.string().optional().or(z.literal('')),
});

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

/**
 * Validação cruzada "comAcesso ⇒ papelId obrigatório" só se aplica na
 * criação — extraída como refinamento aplicado condicionalmente pelo
 * dialog (`zodResolver` com schema escolhido por `isEditing`), em vez de
 * embutida acima, para não impedir a edição de reabrir o formulário com
 * `comAcesso` já `true`/`false` vindo do backend sem `papelId` (que na
 * edição não é reenviado).
 */
export const collaboratorCreateFormSchema = collaboratorFormSchema.refine(
  (data) => !data.comAcesso || !!data.papelId,
  { message: 'Selecione um papel para conceder acesso ao sistema.', path: ['papelId'] },
);

export const COLLABORATOR_FORM_DEFAULTS: CollaboratorFormValues = {
  nome: '',
  nomeSocial: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  estadoCivil: '',
  profissao: '',
  nomeMae: '',
  nomePai: '',
  anotacoes: '',
  fotoUrl: '',
  email: '',
  telefone: '',
  celular: '',
  whatsapp: '',
  enderecoCep: '',
  enderecoLogradouro: '',
  enderecoNumero: '',
  enderecoComplemento: '',
  enderecoBairro: '',
  enderecoCidade: '',
  enderecoUf: '',
  enderecoPais: 'Brasil',
  cargoId: '',
  grupoIds: [],
  departamento: '',
  numeroOab: '',
  ufOab: '',
  situacaoOab: '',
  observacaoOab: '',
  dataEntrada: '',
  responsavelId: '',
  comAcesso: false,
  papelId: '',
};
