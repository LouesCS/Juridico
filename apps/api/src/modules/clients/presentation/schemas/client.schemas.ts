import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../../../../shared/domain/validators/br-documents';

const ESTADO_CIVIL = ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'] as const;

/**
 * Campos pessoais (Prompt "Clientes e Contatos") — só fazem sentido para
 * Pessoa Física, mas ficam soltos (sem `.refine` de obrigatoriedade cruzada
 * com `tipo`) porque nenhum é obrigatório mesmo para PF; o formulário do
 * frontend decide o que mostrar por `tipo`.
 */
const camposPessoais = {
  avatarUrl: z.string().url().max(500).optional(),
  rg: z.string().max(30).optional(),
  nomeMae: z.string().max(120).optional(),
  nomePai: z.string().max(120).optional(),
  estadoCivil: z.enum(ESTADO_CIVIL).optional(),
  profissao: z.string().max(120).optional(),
  dataNascimento: z.string().date().optional(),
  // Valores dos Campos Extras (Configuration Engine, entidade CLIENTE) —
  // `{ [campoExtraId]: valor }`; validação de "campo existe/é obrigatório"
  // fica a cargo do use case (precisa consultar `CampoExtra`/`CampoObrigatorio`).
  camposExtrasValores: z.record(z.string().uuid(), z.string().max(2000)).optional(),
};

/** Reafirma docs/api/18-dtos.md §18.4 — `CriarClienteDTO`. */
export const createClientSchema = z
  .object({
    tipo: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA']),
    nome: z.string().min(2).max(120),
    nomeSocial: z.string().max(120).optional(),
    razaoSocial: z.string().min(2).max(160).optional(),
    cpf: z
      .string()
      .refine((v) => isValidCpf(v), 'CPF com dígito verificador inválido.')
      .optional(),
    cnpj: z
      .string()
      .refine((v) => isValidCnpj(v), 'CNPJ com dígito verificador inválido.')
      .optional(),
    emails: z.array(z.string().email()).max(10).default([]),
    telefones: z.array(z.string().min(8).max(20)).max(10).default([]),
    telefoneResidencial: z.string().min(8).max(20).optional(),
    telefoneResponsavel: z.string().min(8).max(20).optional(),
    enderecoLogradouro: z.string().max(160).optional(),
    enderecoNumero: z.string().max(20).optional(),
    enderecoComplemento: z.string().max(80).optional(),
    enderecoBairro: z.string().max(80).optional(),
    enderecoCidade: z.string().max(80).optional(),
    enderecoUf: z.string().length(2).optional(),
    enderecoCep: z
      .string()
      .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos.')
      .optional(),
    observacoes: z.string().max(4000).optional(),
    responsavelId: z.string().uuid().optional(),
    responsavelNome: z.string().max(120).optional(),
    ...camposPessoais,
  })
  .strict()
  .refine((data) => data.tipo !== 'PESSOA_JURIDICA' || !!data.razaoSocial, {
    message: 'Razão social é obrigatória para Pessoa Jurídica.',
    path: ['razaoSocial'],
  });
export type CreateClientDto = z.infer<typeof createClientSchema>;

export const updateClientSchema = z
  .object({
    tipo: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA']).optional(),
    nome: z.string().min(2).max(120).optional(),
    nomeSocial: z.string().max(120).optional(),
    razaoSocial: z.string().min(2).max(160).optional(),
    cpf: z
      .string()
      .refine((v) => isValidCpf(v), 'CPF com dígito verificador inválido.')
      .optional(),
    cnpj: z
      .string()
      .refine((v) => isValidCnpj(v), 'CNPJ com dígito verificador inválido.')
      .optional(),
    emails: z.array(z.string().email()).max(10).optional(),
    telefones: z.array(z.string().min(8).max(20)).max(10).optional(),
    telefoneResidencial: z.string().min(8).max(20).optional(),
    telefoneResponsavel: z.string().min(8).max(20).optional(),
    enderecoLogradouro: z.string().max(160).optional(),
    enderecoNumero: z.string().max(20).optional(),
    enderecoComplemento: z.string().max(80).optional(),
    enderecoBairro: z.string().max(80).optional(),
    enderecoCidade: z.string().max(80).optional(),
    enderecoUf: z.string().length(2).optional(),
    enderecoCep: z
      .string()
      .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos.')
      .optional(),
    observacoes: z.string().max(4000).optional(),
    responsavelId: z.string().uuid().optional(),
    responsavelNome: z.string().max(120).optional(),
    ...camposPessoais,
  })
  .strict();
export type UpdateClientDto = z.infer<typeof updateClientSchema>;

export const listClientsQuerySchema = z
  .object({
    q: z.string().max(120).optional(),
    nome: z.string().max(120).optional(),
    telefone: z.string().max(20).optional(),
    celular: z.string().max(20).optional(),
    email: z.string().max(160).optional(),
    cpf: z.string().max(20).optional(),
    cnpj: z.string().max(20).optional(),
    tipo: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA']).optional(),
    responsavelId: z.string().uuid().optional(),
    nomeMae: z.string().max(120).optional(),
    nomePai: z.string().max(120).optional(),
    estadoCivil: z.enum(ESTADO_CIVIL).optional(),
    profissao: z.string().max(120).optional(),
    diaNascimento: z.coerce.number().int().min(1).max(31).optional(),
    mesNascimento: z.coerce.number().int().min(1).max(12).optional(),
    anoNascimento: z.coerce.number().int().min(1900).max(2200).optional(),
    dataCadastro: z.string().date().optional(),
    periodoCadastroInicio: z.string().date().optional(),
    periodoCadastroFim: z.string().date().optional(),
    ultimaAlteracao: z.string().date().optional(),
    sort: z
      .enum(['nome', '-nome', '-criadoEm', 'criadoEm', 'atualizadoEm', '-atualizadoEm'])
      .default('-criadoEm'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;

/** Mesmos filtros de `listClientsQuerySchema`, sem paginação por cursor — `GET /clients/export` varre até `EXPORT_LIMIT` (use case) registros de uma vez. */
export const exportClientsQuerySchema = listClientsQuerySchema.omit({ cursor: true, limit: true });
export type ExportClientsQuery = z.infer<typeof exportClientsQuerySchema>;

/** Mesmo formato de `listTaskTimelineQuerySchema` (Prompt 14) — reafirma o padrão, não duplica a ideia com nomes diferentes. */
export const listClientTimelineQuerySchema = z
  .object({
    tipo: z.string().max(200).optional(),
    q: z.string().max(120).optional(),
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListClientTimelineQuery = z.infer<typeof listClientTimelineQuerySchema>;
