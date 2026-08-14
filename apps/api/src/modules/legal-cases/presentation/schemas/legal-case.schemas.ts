import { z } from 'zod';

/** Reafirma docs/api/18-dtos.md §18.5 — `CriarProcessoDTO`. */
export const createLegalCaseSchema = z
  .object({
    titulo: z.string().min(3).max(200),
    clienteId: z.string().uuid(),
    pastaJuridicaId: z.string().uuid(),
    numeroCnj: z.string().optional(),
    numeroInterno: z.string().max(40).optional(),
    instituicao: z.string().max(200).nullable().optional(),
    numeroBeneficio: z.string().max(80).nullable().optional(),
    roNumeroBeneficio: z.string().max(80).nullable().optional(),
    // Coluna `area` é NOT NULL em `Processo` (schema.prisma) — obrigatória
    // na criação mesmo a documentação de DTO não marcando (`—`); registrado
    // como divergência resolvida em docs/backend-implementation/19-decisions.md.
    area: z.string().min(1).max(60),
    tipoAcao: z.string().max(100).optional(),
    tipo: z.enum(['JUDICIAL', 'ADMINISTRATIVO', 'CONSULTIVO', 'EXTRAJUDICIAL']).default('JUDICIAL'),
    tribunal: z.string().max(100).optional(),
    comarca: z.string().max(100).optional(),
    vara: z.string().max(100).optional(),
    uf: z.string().length(2).optional(),
    instancia: z.enum(['PRIMEIRA', 'SEGUNDA', 'SUPERIOR']).optional(),
    classeProcessual: z.string().max(120).optional(),
    assunto: z.string().max(200).optional(),
    poloCliente: z.enum(['ATIVO', 'PASSIVO', 'TERCEIRO']),
    status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO']).default('ATIVO'),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
    // `segredoJustica` cobre também o conceito de "Confidencial" do
    // Prompt 7 — o schema não modela os dois como colunas separadas.
    segredoJustica: z.boolean().default(false),
    valorCausaCentavos: z.coerce.number().int().nonnegative().optional(),
    dataDistribuicao: z.string().date().optional(),
    dataEncerramento: z.string().date().nullable().optional(),
    responsavelPrincipalId: z.string().uuid(),
    descricao: z.string().max(4000).optional(),
    observacoes: z.string().max(4000).optional(),
  })
  .strict();
export type CreateLegalCaseDto = z.infer<typeof createLegalCaseSchema>;

export const updateLegalCaseSchema = createLegalCaseSchema.partial().strict();
export type UpdateLegalCaseDto = z.infer<typeof updateLegalCaseSchema>;

/** Reafirma o enum `TipoParticipante` do Prisma — mantido em um único lugar
 * para evitar que os DTOs de partes (Extrajudicial, Judicial, CRUD avulso)
 * divirjam entre si conforme novos papéis são adicionados. */
export const tipoParticipanteValues = [
  'AUTOR',
  'REU',
  'TERCEIRO_INTERESSADO',
  'ASSISTENTE',
  'MINISTERIO_PUBLICO',
  'TESTEMUNHA',
  'PERITO',
  'ADVOGADO_EXTERNO',
  'ADVOGADO_AUTOR',
  'ADVOGADO_REU',
  'JUIZ',
  'PROMOTOR',
  'REPRESENTANTE_LEGAL',
  'OUTRO',
] as const;

const extrajudicialPartySchema = z
  .object({
    id: z.string().uuid().optional(),
    clienteId: z.string().uuid().nullable().optional(),
    tipo: z.enum(tipoParticipanteValues),
    principal: z.boolean().default(false),
  })
  .refine((value) => value.id || value.clienteId, 'Informe uma parte existente ou um Cliente.');

export const updateExtrajudicialAggregateSchema = z
  .object({
    processo: z.object({
      numeroInterno: z.string().min(1).max(40),
      instituicao: z.string().max(200).nullable(),
      dataDistribuicao: z.string().date(),
      dataEncerramento: z.string().date().nullable(),
      status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO']),
      observacoes: z.string().max(4000).nullable(),
      numeroBeneficio: z.string().max(80).nullable(),
    }),
    partes: z.array(extrajudicialPartySchema).max(100),
  })
  .strict();
export type UpdateExtrajudicialAggregateDto = z.infer<typeof updateExtrajudicialAggregateSchema>;

const judicialPartySchema = z
  .object({
    id: z.string().uuid().optional(),
    clienteId: z.string().uuid().nullable().optional(),
    tipo: z.enum(tipoParticipanteValues),
    principal: z.boolean().default(false),
  })
  .refine((value) => value.id || value.clienteId, 'Informe uma parte existente ou um Cliente.');

/** Reafirma docs/api/09-legal-cases.md — atualização agregada do Processo
 * Judicial (`PATCH /legal-cases/:id/judicial`), espelhando exatamente o
 * padrão transacional já usado pelo Extrajudicial
 * (`updateExtrajudicialAggregateSchema`), apenas com os campos próprios do
 * Judicial no lugar dos do Extrajudicial. */
export const updateJudicialAggregateSchema = z
  .object({
    processo: z.object({
      numeroCnj: z.string().min(1).max(25),
      tribunal: z.string().max(100).nullable(),
      comarca: z.string().max(100).nullable(),
      vara: z.string().max(100).nullable(),
      tipoAcao: z.string().max(100).nullable(),
      area: z.string().min(1).max(60),
      poloCliente: z.enum(['ATIVO', 'PASSIVO', 'TERCEIRO']),
      instancia: z.enum(['PRIMEIRA', 'SEGUNDA', 'SUPERIOR']),
      dataDistribuicao: z.string().date(),
      dataEncerramento: z.string().date().nullable(),
      status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO']),
      observacoes: z.string().max(4000).nullable(),
      numeroBeneficio: z.string().max(80).nullable(),
      roNumeroBeneficio: z.string().max(80).nullable(),
    }),
    partes: z.array(judicialPartySchema).max(100),
  })
  .strict();
export type UpdateJudicialAggregateDto = z.infer<typeof updateJudicialAggregateSchema>;

export const listLegalCasesQuerySchema = z
  .object({
    status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO']).optional(),
    tipo: z.enum(['JUDICIAL', 'ADMINISTRATIVO', 'CONSULTIVO', 'EXTRAJUDICIAL']).optional(),
    pastaJuridicaId: z.string().uuid().optional(),
    responsavelId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    area: z.string().max(60).optional(),
    tribunal: z.string().max(100).optional(),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).optional(),
    dataDistribuicaoDe: z.string().date().optional(),
    dataDistribuicaoAte: z.string().date().optional(),
    dataEncerramentoDe: z.string().date().optional(),
    dataEncerramentoAte: z.string().date().optional(),
    protocolo: z.string().max(40).optional(),
    parteId: z.string().uuid().optional(),
    parteContrariaId: z.string().uuid().optional(),
    encarregadoId: z.string().uuid().optional(),
    semMovimentacoesApos: z.string().date().optional(),
    meusApenas: z.coerce.boolean().default(false),
    q: z.string().max(120).optional(),
    sort: z
      .enum([
        '-ultimaAtualizacaoEm',
        'ultimaAtualizacaoEm',
        'titulo',
        '-titulo',
        'dataDistribuicao',
        '-dataDistribuicao',
      ])
      .default('-ultimaAtualizacaoEm'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListLegalCasesQuery = z.infer<typeof listLegalCasesQuerySchema>;

export const listLegalCasePartyOptionsQuerySchema = z.object({
  q: z.string().max(120).default(''),
  tipo: z.enum(['TODAS', 'REU']).default('TODAS'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

/** Reafirma docs/api/09-legal-cases.md §9.2 — Equipe (`ProcessoMembro`). */
export const addCaseTeamMemberSchema = z
  .object({
    membroId: z.string().uuid(),
    funcaoNoProcesso: z.string().max(80).optional(),
    acessoPermitido: z.enum(['LEITURA', 'LEITURA_ESCRITA']).default('LEITURA_ESCRITA'),
  })
  .strict();
export type AddCaseTeamMemberDto = z.infer<typeof addCaseTeamMemberSchema>;

export const changeCaseResponsibleSchema = z.object({ membroId: z.string().uuid() }).strict();
export type ChangeCaseResponsibleDto = z.infer<typeof changeCaseResponsibleSchema>;

/** Reafirma docs/api/09-legal-cases.md §9.3 — Participantes (`ParteProcesso`). */
export const createCasePartySchema = z
  .object({
    tipo: z.enum(tipoParticipanteValues),
    natureza: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA']),
    nome: z.string().min(2).max(150),
    documento: z.string().max(20).optional(),
    clienteId: z.string().uuid().optional(),
    oabNumero: z.string().max(20).optional(),
    oabUf: z.string().length(2).optional(),
    observacoes: z.string().max(2000).optional(),
    principal: z.boolean().default(false),
  })
  .strict();
export type CreateCasePartyDto = z.infer<typeof createCasePartySchema>;

export const updateCasePartySchema = createCasePartySchema.partial().strict();
export type UpdateCasePartyDto = z.infer<typeof updateCasePartySchema>;

/** Reafirma docs/api/09-legal-cases.md §9.4 — Prazos (`Prazo`). */
export const createCaseDeadlineSchema = z
  .object({
    titulo: z.string().min(2).max(200),
    descricao: z.string().max(2000).optional(),
    tipo: z.enum(['FATAL', 'INTERNO', 'AUDIENCIA', 'REUNIAO', 'TAREFA']),
    dataVencimento: z.string().date(),
    horaVencimento: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    responsavelId: z.string().uuid(),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  })
  .strict();
export type CreateCaseDeadlineDto = z.infer<typeof createCaseDeadlineSchema>;

export const updateCaseDeadlineSchema = z
  .object({
    titulo: z.string().min(2).max(200).optional(),
    descricao: z.string().max(2000).optional(),
    dataVencimento: z.string().date().optional(),
    horaVencimento: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    responsavelId: z.string().uuid().optional(),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).optional(),
    status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'ATRASADO']).optional(),
  })
  .strict();
export type UpdateCaseDeadlineDto = z.infer<typeof updateCaseDeadlineSchema>;

export const cancelCaseDeadlineSchema = z
  .object({ motivoCancelamento: z.string().min(3).max(500).optional() })
  .strict();
export type CancelCaseDeadlineDto = z.infer<typeof cancelCaseDeadlineSchema>;

/** Reafirma docs/api/09-legal-cases.md §9.4 — `GET /v1/deadlines` (agregado, Dashboard). */
export const listDeadlinesAggregateQuerySchema = z
  .object({
    escopo: z.enum(['meus', 'equipe', 'todos']).default('meus'),
    status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'ATRASADO']).optional(),
    tipo: z.enum(['FATAL', 'INTERNO', 'AUDIENCIA', 'REUNIAO', 'TAREFA']).optional(),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).optional(),
    responsavelId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    processoId: z.string().uuid().optional(),
    q: z.string().max(120).optional(),
    dataVencimentoDe: z.string().date().optional(),
    dataVencimentoAte: z.string().date().optional(),
    sort: z.enum(['dataVencimento', '-dataVencimento', 'prioridade']).default('dataVencimento'),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
export type ListDeadlinesAggregateQuery = z.infer<typeof listDeadlinesAggregateQuerySchema>;
