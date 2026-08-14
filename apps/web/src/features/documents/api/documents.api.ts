import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/documents/` (Sprint 09).
 * `hashSha256`/`storageKey` nunca aparecem aqui — o binário nunca trafega
 * pela API (docs/api/10-documents.md §10.1); o cliente só vê URLs assinadas
 * de curta duração.
 */
export type DocumentType =
  | 'PETICAO'
  | 'CONTRATO'
  | 'PROCURACAO'
  | 'SENTENCA'
  | 'DECISAO'
  | 'COMPROVANTE'
  | 'PARECER'
  | 'OUTRO';
export type DocumentConfidentiality = 'PADRAO' | 'CONFIDENCIAL';
export type DocumentVisibility = 'INTERNA' | 'COMPARTILHADA' | 'PUBLICA';
export type DocumentUploadStatus = 'PENDENTE' | 'CONCLUIDO' | 'FALHA';
export type DocumentProcessingStatus = 'PENDENTE' | 'PROCESSANDO' | 'PRONTO' | 'FALHA';
export type DocumentAntivirusStatus = 'PENDENTE' | 'LIMPO' | 'INFECTADO' | 'ERRO';
export type DocumentView = 'todos' | 'recentes' | 'favoritos' | 'compartilhados' | 'lixeira' | 'versionados';

export interface DocumentTagDTO {
  id: string;
  nome: string;
  cor: string;
}

export interface DocumentListItemDTO {
  id: string;
  nome: string;
  extensao: string;
  mimeType: string;
  tamanhoBytes: string;
  tipo: DocumentType;
  categoria: string | null;
  confidencialidade: DocumentConfidentiality;
  statusUpload: DocumentUploadStatus;
  statusProcessamento: DocumentProcessingStatus;
  statusAntivirus: DocumentAntivirusStatus;
  versaoAtual: number;
  totalVersoes: number;
  pasta: { id: string; nome: string } | null;
  processo: { id: string; titulo: string } | null;
  cliente: { id: string; nome: string } | null;
  autor: { id: string; nome: string; avatarUrl: string | null } | null;
  tags: DocumentTagDTO[];
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
  excluidoEm: string | null;
}

export interface DocumentDetailDTO extends Omit<DocumentListItemDTO, 'totalVersoes'> {
  nomeOriginal: string;
  descricao: string | null;
  visibilidade: DocumentVisibility;
  dataDocumento: string | null;
  totalVersoes: number;
}

export interface ListDocumentsParams {
  visao?: DocumentView;
  pastaId?: string;
  processoId?: string;
  clienteId?: string;
  resourceType?: 'PASTA_JURIDICA';
  resourceId?: string;
  tipo?: DocumentType;
  categoria?: string;
  tagId?: string;
  q?: string;
  sort?:
    | '-atualizadoEm'
    | 'atualizadoEm'
    | 'nome'
    | '-nome'
    | '-criadoEm'
    | 'criadoEm'
    | '-tamanhoBytes'
    | 'tamanhoBytes';
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface ListDocumentsResult {
  items: DocumentListItemDTO[];
  nextCursor: string | null;
  total: number;
  disponivel: boolean;
}

export interface PresignUploadInput {
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  processoId?: string;
  clienteId?: string;
  pastaId?: string;
  resourceType?: 'PASTA_JURIDICA';
  resourceId?: string;
  tipo?: DocumentType;
  categoria?: string;
}

export interface PresignUploadResult {
  documentoId: string;
  uploadUrl: string;
  expiraEm: string;
}

export interface ConfirmUploadResult {
  id: string;
  avisoDuplicidade: { documentoExistenteId: string; nome: string } | null;
}

export interface UpdateDocumentInput {
  nome?: string;
  descricao?: string | null;
  tipo?: DocumentType;
  categoria?: string | null;
  confidencialidade?: DocumentConfidentiality;
  visibilidade?: DocumentVisibility;
  dataDocumento?: string | null;
  clienteId?: string | null;
  tagIds?: string[];
}

export interface MoveDocumentInput {
  pastaId?: string | null;
  processoId?: string | null;
}

export interface DocumentVersionDTO {
  id: string;
  numero: number;
  tamanhoBytes: string;
  comentarioVersao: string | null;
  vigente: boolean;
  autor: { id: string; nome: string } | null;
  criadoEm: string;
}

export interface PresignVersionInput {
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  comentarioVersao?: string;
}

export interface PresignVersionResult {
  uploadUrl: string;
  expiraEm: string;
  proximoNumero: number;
  versionToken: string;
}

export interface DashboardSummaryDTO {
  recentes: Array<{ id: string; nome: string; extensao: string; tipo: DocumentType; atualizadoEm: string }>;
  favoritos: Array<{ id: string; nome: string; extensao: string; tipo: DocumentType; atualizadoEm: string }>;
  totalDocumentos: number;
  armazenamento: { bytesUsados: string; bytesQuota: string; percentualUsado: number };
}

export const documentsApi = {
  list: (params: ListDocumentsParams = {}) =>
    apiClient.get<ListDocumentsResult>('/documents', { query: { ...params } }),

  dashboardSummary: () => apiClient.get<DashboardSummaryDTO>('/documents/dashboard-summary'),

  presignUpload: (input: PresignUploadInput) =>
    apiClient.post<PresignUploadResult>('/documents/presign', input),

  confirmUpload: (documentoId: string, hashSha256: string) =>
    apiClient.post<ConfirmUploadResult>(`/documents/${documentoId}/confirm`, { hashSha256 }),

  get: (id: string) => apiClient.get<DocumentDetailDTO>(`/documents/${id}`),

  update: (id: string, input: UpdateDocumentInput) => apiClient.patch<void>(`/documents/${id}`, input),

  remove: (id: string) => apiClient.delete<void>(`/documents/${id}`),

  unlinkLegalFolder: (id: string, folderId: string) =>
    apiClient.delete<void>(`/documents/${id}/links/legal-folder/${folderId}`),

  restore: (id: string) => apiClient.post<void>(`/documents/${id}/restore`),

  duplicate: (id: string) => apiClient.post<{ id: string }>(`/documents/${id}/duplicate`),

  move: (id: string, input: MoveDocumentInput) => apiClient.patch<void>(`/documents/${id}/move`, input),

  toggleFavorite: (id: string) => apiClient.post<{ favorito: boolean }>(`/documents/${id}/favorite`),

  download: (id: string) => apiClient.get<{ url: string; expiraEm: string }>(`/documents/${id}/download`),

  preview: (id: string) =>
    apiClient.get<{ url: string; expiraEm: string; mimeType: string }>(`/documents/${id}/preview`),

  listVersions: (id: string) => apiClient.get<DocumentVersionDTO[]>(`/documents/${id}/versions`),

  downloadVersion: (id: string, versaoId: string) =>
    apiClient.get<{ url: string; expiraEm: string }>(`/documents/${id}/versions/${versaoId}/download`),

  presignVersion: (id: string, input: PresignVersionInput) =>
    apiClient.post<PresignVersionResult>(`/documents/${id}/versions/presign`, input),

  confirmVersion: (id: string, versionToken: string, hashSha256: string, comentarioVersao?: string) =>
    apiClient.post<{ id: string; numero: number }>(`/documents/${id}/versions/confirm`, {
      versionToken,
      hashSha256,
      comentarioVersao,
    }),
};
