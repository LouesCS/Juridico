import { z } from 'zod';

const ESTADO_CIVIL = ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'] as const;

/**
 * Módulo Colaboradores — campos de perfil compartilhados por
 * `createCollaboratorSchema`/`updateCollaboratorSchema` (mesma técnica de
 * `camposPessoais` em `client.schemas.ts`). Agrupados por comentário
 * (dados pessoais / contato / endereço / dados profissionais) — o schema em
 * si fica plano (sem objetos aninhados), reafirmando a convenção já usada
 * em `Cliente` (campos `enderecoX` soltos, não `endereco: {...}`).
 */
const camposPerfilColaborador = {
  // Dados pessoais
  nomeSocial: z.string().max(120).optional(),
  cpf: z.string().max(20).optional(),
  rg: z.string().max(20).optional(),
  dataNascimento: z.string().date().optional(),
  estadoCivil: z.enum(ESTADO_CIVIL).optional(),
  profissao: z.string().max(120).optional(),
  nomeMae: z.string().max(120).optional(),
  nomePai: z.string().max(120).optional(),
  anotacoes: z.string().max(4000).optional(),
  fotoUrl: z.string().url().max(500).optional(),
  // Contato
  telefone: z.string().max(20).optional(),
  celular: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  // Endereço
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
  enderecoPais: z.string().max(60).optional(),
  // Dados profissionais
  cargoId: z.string().uuid().nullable().optional(),
  departamento: z.string().max(120).optional(),
  numeroOab: z.string().max(20).optional(),
  ufOab: z.string().length(2).optional(),
  situacaoOab: z.string().max(60).optional(),
  observacaoOab: z.string().max(400).optional(),
  dataEntrada: z.string().date().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
};

/**
 * `papelId` é sempre obrigatório aqui, mesmo quando `comAcesso: false` —
 * DESVIO deliberado da literalidade do prompt original ("papelId obrigatório
 * só quando comAcesso===true"): `Membro.papelId` é `NOT NULL` no schema
 * (linha já existente antes do módulo Colaboradores, não alterada nesta
 * rodada), então todo `Membro` — com ou sem conta de acesso — precisa de um
 * papel válido persistido. O papel só passa a ter efeito prático (RBAC) a
 * partir do momento em que o colaborador ganha acesso, mas a coluna exige um
 * valor desde a criação.
 */
export const createCollaboratorSchema = z
  .object({
    nome: z.string().min(2).max(120),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase().trim()),
    papelId: z.string().uuid(),
    comAcesso: z.boolean().default(false),
    grupoIds: z.array(z.string().uuid()).max(50).optional(),
    ...camposPerfilColaborador,
  })
  .strict();
export type CreateCollaboratorDto = z.infer<typeof createCollaboratorSchema>;

/** Acesso (`comAcesso`/`papelId`) não é editável por aqui — ver `grantAccessSchema`/rotas dedicadas de bloqueio/acesso. */
export const updateCollaboratorSchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase().trim())
      .optional(),
    grupoIds: z.array(z.string().uuid()).max(50).optional(),
    ...camposPerfilColaborador,
  })
  .strict();
export type UpdateCollaboratorDto = z.infer<typeof updateCollaboratorSchema>;

export const grantAccessSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase().trim())
      .optional(),
    papelId: z.string().uuid(),
  })
  .strict();
export type GrantAccessDto = z.infer<typeof grantAccessSchema>;

const ACESSO_FILTRO = ['com_acesso', 'sem_acesso'] as const;
const SITUACAO_FILTRO = [
  'desbloqueado',
  'bloqueado',
  'suspenso',
  'convite_pendente',
  'sem_acesso',
  'inativo',
] as const;
const COLLABORATOR_SORT = [
  'nome_asc',
  'nome_desc',
  'cargo_asc',
  'cargo_desc',
  'nascimento_asc',
  'nascimento_desc',
  'cadastro_asc',
  'cadastro_desc',
  'alteracao_asc',
  'alteracao_desc',
] as const;

/**
 * `GET /members` estendido pelo módulo Colaboradores — TODOS os campos
 * abaixo são opcionais e a ausência total de query params preserva o
 * comportamento anterior ("listar tudo, ordenação padrão"), reafirmando
 * retrocompatibilidade com quem hoje chama a rota sem parâmetros (ex.:
 * seletor de "Responsável" no frontend).
 */
export const listCollaboratorsQuerySchema = z
  .object({
    q: z.string().max(120).optional(),
    nome: z.string().max(120).optional(),
    cpf: z.string().max(20).optional(),
    email: z.string().max(160).optional(),
    telefone: z.string().max(20).optional(),
    grupoId: z.string().uuid().optional(),
    cargoId: z.string().uuid().optional(),
    acesso: z.enum(ACESSO_FILTRO).optional(),
    situacao: z.enum(SITUACAO_FILTRO).optional(),
    nascimentoDia: z.coerce.number().int().min(1).max(31).optional(),
    nascimentoMes: z.coerce.number().int().min(1).max(12).optional(),
    nascimentoAno: z.coerce.number().int().min(1900).max(2200).optional(),
    nascimentoDe: z.string().date().optional(),
    nascimentoAte: z.string().date().optional(),
    cadastroDe: z.string().date().optional(),
    cadastroAte: z.string().date().optional(),
    alteracaoDe: z.string().date().optional(),
    alteracaoAte: z.string().date().optional(),
    sort: z.enum(COLLABORATOR_SORT).default('nome_asc'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListCollaboratorsQuery = z.infer<typeof listCollaboratorsQuerySchema>;

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  papelId: z.string().uuid(),
});
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  nome: z.string().min(2).max(60).optional(),
  sobrenome: z.string().min(2).max(60).optional(),
  senha: z.string().min(12).optional(),
});
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;

export const updateMemberRoleSchema = z.object({
  papelId: z.string().uuid(),
});
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
