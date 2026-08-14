import { z } from 'zod';

export const documentMetadataSchema = z.object({
  nome: z.string().min(1, 'Informe um nome.').max(255),
  descricao: z.string().max(2000).optional(),
  tipo: z.enum(['PETICAO', 'CONTRATO', 'PROCURACAO', 'SENTENCA', 'DECISAO', 'COMPROVANTE', 'PARECER', 'OUTRO']),
  categoria: z.string().max(60).optional(),
  confidencialidade: z.enum(['PADRAO', 'CONFIDENCIAL']),
});
export type DocumentMetadataFormValues = z.infer<typeof documentMetadataSchema>;

export const DOCUMENT_TYPE_LABEL: Record<DocumentMetadataFormValues['tipo'], string> = {
  PETICAO: 'Petição',
  CONTRATO: 'Contrato',
  PROCURACAO: 'Procuração',
  SENTENCA: 'Sentença',
  DECISAO: 'Decisão',
  COMPROVANTE: 'Comprovante',
  PARECER: 'Parecer',
  OUTRO: 'Outro',
};
