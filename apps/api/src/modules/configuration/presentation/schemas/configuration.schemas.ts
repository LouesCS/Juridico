import { z } from 'zod';

/** Reafirma docs/backend-implementation/22-configuration-engine.md §22.3 (Geral). */
export const updateGeneralSettingsSchema = z
  .object({
    fusoHorario: z.string().min(1).max(60).optional(),
    idioma: z.string().min(2).max(10).optional(),
    formatoData: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    moedaPadrao: z.string().length(3).optional(),
    diaInicioSemana: z.number().int().min(0).max(6).optional(),
    notificacoesPadrao: z.boolean().optional(),
  })
  .strict();
export type UpdateGeneralSettingsDto = z.infer<typeof updateGeneralSettingsSchema>;

export const updateFinancialSettingsSchema = z
  .object({
    formaCalculoHonorarioPadrao: z.enum(['FIXO', 'PERCENTUAL', 'MISTO']).optional(),
    percentualHonorarioPadrao: z.number().min(0).max(100).nullable().optional(),
    diasVencimentoPadrao: z.number().int().min(0).max(365).optional(),
  })
  .strict();
export type UpdateFinancialSettingsDto = z.infer<typeof updateFinancialSettingsSchema>;

export const AI_SETTINGS_PROVIDERS = ['fake', 'openai', 'anthropic', 'gemini', 'ollama'] as const;
export const updateAiSettingsSchema = z
  .object({
    providerPadrao: z.enum(AI_SETTINGS_PROVIDERS).optional(),
    modeloPadrao: z.string().max(80).nullable().optional(),
    cotaMensalPersonalizada: z.number().int().min(1).nullable().optional(),
    exigirRevisaoHumana: z.boolean().optional(),
  })
  .strict();
export type UpdateAiSettingsDto = z.infer<typeof updateAiSettingsSchema>;

export const ENTIDADE_CONFIGURAVEL = [
  'CLIENTE',
  'PROCESSO',
  'DOCUMENTO',
  'TAREFA',
  'PASTA_JURIDICA',
] as const;
const chaveSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, 'Chave deve ser slug em minúsculas (ex.: data_nascimento).');

export const createExtraFieldSchema = z
  .object({
    entidade: z.enum(ENTIDADE_CONFIGURAVEL),
    nome: z.string().min(2).max(80),
    chave: chaveSchema,
    tipo: z.enum(['TEXTO', 'NUMERO', 'DATA', 'BOOLEANO', 'SELECT', 'MULTISELECT', 'TEXTAREA']),
    obrigatorio: z.boolean().default(false),
    opcoes: z.array(z.string().min(1).max(80)).max(50).default([]),
    valorPadrao: z.string().max(2000).optional(),
    ordem: z.number().int().min(0).default(0),
  })
  .strict()
  .refine((d) => !['SELECT', 'MULTISELECT'].includes(d.tipo) || d.opcoes.length > 0, {
    message: 'Campos SELECT/MULTISELECT exigem ao menos uma opção.',
    path: ['opcoes'],
  });
export type CreateExtraFieldDto = z.infer<typeof createExtraFieldSchema>;

export const updateExtraFieldSchema = z
  .object({
    nome: z.string().min(2).max(80).optional(),
    tipo: z
      .enum(['TEXTO', 'NUMERO', 'DATA', 'BOOLEANO', 'SELECT', 'MULTISELECT', 'TEXTAREA'])
      .optional(),
    obrigatorio: z.boolean().optional(),
    opcoes: z.array(z.string().min(1).max(80)).max(50).optional(),
    valorPadrao: z.string().max(2000).nullable().optional(),
    ordem: z.number().int().min(0).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateExtraFieldDto = z.infer<typeof updateExtraFieldSchema>;

export const bulkUpdateRequiredFieldsSchema = z
  .object({
    itens: z
      .array(
        z
          .object({
            entidade: z.enum(ENTIDADE_CONFIGURAVEL),
            campo: z.string().min(1).max(60),
            obrigatorio: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type BulkUpdateRequiredFieldsDto = z.infer<typeof bulkUpdateRequiredFieldsSchema>;

export const createValueSetSchema = z
  .object({
    nome: z.string().min(2).max(80),
    descricao: z.string().max(400).optional(),
  })
  .strict();
export type CreateValueSetDto = z.infer<typeof createValueSetSchema>;

export const updateValueSetSchema = z
  .object({
    nome: z.string().min(2).max(80).optional(),
    descricao: z.string().max(400).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateValueSetDto = z.infer<typeof updateValueSetSchema>;

export const createValueSetItemSchema = z
  .object({
    valor: z.string().min(1).max(120),
    ordem: z.number().int().min(0).default(0),
  })
  .strict();
export type CreateValueSetItemDto = z.infer<typeof createValueSetItemSchema>;

export const updateValueSetItemSchema = z
  .object({
    valor: z.string().min(1).max(120).optional(),
    ordem: z.number().int().min(0).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateValueSetItemDto = z.infer<typeof updateValueSetItemSchema>;

export const createTaskCategorySchema = z
  .object({
    nome: z.string().min(2).max(80),
    cor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default('#6366F1'),
  })
  .strict();
export type CreateTaskCategoryDto = z.infer<typeof createTaskCategorySchema>;

export const updateTaskCategorySchema = z
  .object({
    nome: z.string().min(2).max(80).optional(),
    cor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    ordem: z.number().int().min(0).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateTaskCategoryDto = z.infer<typeof updateTaskCategorySchema>;

export const createCollaboratorGroupSchema = z
  .object({
    nome: z.string().min(2).max(80),
    descricao: z.string().max(400).optional(),
  })
  .strict();
export type CreateCollaboratorGroupDto = z.infer<typeof createCollaboratorGroupSchema>;

export const updateCollaboratorGroupSchema = z
  .object({
    nome: z.string().min(2).max(80).optional(),
    descricao: z.string().max(400).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateCollaboratorGroupDto = z.infer<typeof updateCollaboratorGroupSchema>;

export const addGroupMemberSchema = z
  .object({
    membroId: z.string().uuid(),
  })
  .strict();
export type AddGroupMemberDto = z.infer<typeof addGroupMemberSchema>;

/**
 * Catálogo de Cargos (módulo Colaboradores) — clone estrutural de
 * `createCollaboratorGroupSchema`/`updateCollaboratorGroupSchema` acima,
 * com `ordem` (inteiro simples; o cliente ordena por ele, sem endpoint de
 * reordenação dedicado).
 */
export const createCargoSchema = z
  .object({
    nome: z.string().min(2).max(80),
    descricao: z.string().max(400).optional(),
    ordem: z.number().int().min(0).default(0),
  })
  .strict();
export type CreateCargoDto = z.infer<typeof createCargoSchema>;

export const updateCargoSchema = z
  .object({
    nome: z.string().min(2).max(80).optional(),
    descricao: z.string().max(400).optional(),
    ordem: z.number().int().min(0).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateCargoDto = z.infer<typeof updateCargoSchema>;

export const createTaskTemplateSchema = z
  .object({
    nome: z.string().min(2).max(120),
    descricao: z.string().max(400).optional(),
    categoriaId: z.string().uuid().optional(),
    prazoDiasPadrao: z.number().int().min(0).max(3650).default(0),
    prioridadePadrao: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
    checklist: z.array(z.string().min(1).max(200)).max(50).default([]),
  })
  .strict();
export type CreateTaskTemplateDto = z.infer<typeof createTaskTemplateSchema>;

export const updateTaskTemplateSchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    descricao: z.string().max(400).optional(),
    categoriaId: z.string().uuid().nullable().optional(),
    prazoDiasPadrao: z.number().int().min(0).max(3650).optional(),
    prioridadePadrao: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).optional(),
    checklist: z.array(z.string().min(1).max(200)).max(50).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateTaskTemplateDto = z.infer<typeof updateTaskTemplateSchema>;

export const createHolidaySchema = z
  .object({
    nome: z.string().min(2).max(120),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.'),
    tipo: z
      .enum(['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FORENSE', 'PERSONALIZADO'])
      .default('PERSONALIZADO'),
    uf: z.string().length(2).optional(),
    recorrenteAnual: z.boolean().default(false),
  })
  .strict();
export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    tipo: z.enum(['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'FORENSE', 'PERSONALIZADO']).optional(),
    uf: z.string().length(2).nullable().optional(),
    recorrenteAnual: z.boolean().optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateHolidayDto = z.infer<typeof updateHolidaySchema>;

export const listByEntidadeQuerySchema = z
  .object({
    entidade: z.enum(ENTIDADE_CONFIGURAVEL).optional(),
  })
  .strict();
export type ListByEntidadeQuery = z.infer<typeof listByEntidadeQuerySchema>;
