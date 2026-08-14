import { z } from 'zod';

const tipoDocumentoEnum = z.enum([
  'PETICAO',
  'CONTRATO',
  'PROCURACAO',
  'SENTENCA',
  'DECISAO',
  'COMPROVANTE',
  'PARECER',
  'OUTRO',
]);

/** Reafirma docs/api/10-documents.md §10.3 — `POST /v1/documents/presign`. */
export const presignDocumentUploadSchema = z
  .object({
    nomeArquivo: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(150),
    tamanhoBytes: z.coerce.number().int().positive(),
    processoId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    pastaId: z.string().uuid().optional(),
    resourceType: z.enum(['PASTA_JURIDICA']).optional(),
    resourceId: z.string().uuid().optional(),
    tipo: tipoDocumentoEnum.default('OUTRO'),
    categoria: z.string().max(60).optional(),
  })
  .strict()
  .refine((dto) => Boolean(dto.resourceType) === Boolean(dto.resourceId), {
    message: 'resourceType e resourceId devem ser informados juntos.',
  });
export type PresignDocumentUploadDto = z.infer<typeof presignDocumentUploadSchema>;

/** Reafirma docs/api/10-documents.md §10.4 — `POST /v1/documents/:id/confirm`. */
export const confirmDocumentUploadSchema = z
  .object({
    hashSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'hashSha256 deve ter 64 caracteres hexadecimais.'),
  })
  .strict();
export type ConfirmDocumentUploadDto = z.infer<typeof confirmDocumentUploadSchema>;

/** Reafirma docs/api/10-documents.md §10.2 — `POST /v1/documents/:id/versions` (presign análogo). */
export const presignDocumentVersionSchema = z
  .object({
    nomeArquivo: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(150),
    tamanhoBytes: z.coerce.number().int().positive(),
    comentarioVersao: z.string().max(500).optional(),
  })
  .strict();
export type PresignDocumentVersionDto = z.infer<typeof presignDocumentVersionSchema>;

export const confirmDocumentVersionSchema = z
  .object({
    versionToken: z.string().min(1),
    hashSha256: z.string().regex(/^[a-f0-9]{64}$/i),
    comentarioVersao: z.string().max(500).optional(),
  })
  .strict();
export type ConfirmDocumentVersionDto = z.infer<typeof confirmDocumentVersionSchema>;

export const updateDocumentSchema = z
  .object({
    nome: z.string().min(1).max(255).optional(),
    descricao: z.string().max(2000).nullable().optional(),
    tipo: tipoDocumentoEnum.optional(),
    categoria: z.string().max(60).nullable().optional(),
    confidencialidade: z.enum(['PADRAO', 'CONFIDENCIAL']).optional(),
    visibilidade: z.enum(['INTERNA', 'COMPARTILHADA', 'PUBLICA']).optional(),
    dataDocumento: z.string().date().nullable().optional(),
    clienteId: z.string().uuid().nullable().optional(),
    tagIds: z.array(z.string().uuid()).max(20).optional(),
  })
  .strict();
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;

/** `null` explícito move para "sem pasta"/"sem processo" — reafirma docs/api/10-documents.md §10.7. */
export const moveDocumentSchema = z
  .object({
    pastaId: z.string().uuid().nullable().optional(),
    processoId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((dto) => dto.pastaId !== undefined || dto.processoId !== undefined, {
    message: 'Informe pastaId e/ou processoId.',
  });
export type MoveDocumentDto = z.infer<typeof moveDocumentSchema>;

export const listDocumentsAggregateQuerySchema = z
  .object({
    visao: z
      .enum(['todos', 'recentes', 'favoritos', 'compartilhados', 'lixeira', 'versionados'])
      .default('todos'),
    pastaId: z.string().uuid().optional(),
    processoId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    resourceType: z.enum(['PASTA_JURIDICA']).optional(),
    resourceId: z.string().uuid().optional(),
    tipo: tipoDocumentoEnum.optional(),
    categoria: z.string().max(60).optional(),
    tagId: z.string().uuid().optional(),
    q: z.string().max(120).optional(),
    sort: z
      .enum([
        '-atualizadoEm',
        'atualizadoEm',
        'nome',
        '-nome',
        '-criadoEm',
        'criadoEm',
        '-tamanhoBytes',
        'tamanhoBytes',
      ])
      .default('-atualizadoEm'),
    cursor: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict()
  .refine((dto) => Boolean(dto.resourceType) === Boolean(dto.resourceId), {
    message: 'resourceType e resourceId devem ser informados juntos.',
  });
export type ListDocumentsAggregateQuery = z.infer<typeof listDocumentsAggregateQuerySchema>;

export const createTagSchema = z
  .object({
    nome: z.string().min(1).max(60),
    cor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default('#6366f1'),
    descricao: z.string().max(200).optional(),
  })
  .strict();
export type CreateTagDto = z.infer<typeof createTagSchema>;
