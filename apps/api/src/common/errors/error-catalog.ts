/**
 * Catálogo de códigos de erro — espelha docs/api/17-errors.md.
 *
 * NOTA DE CONFLITO RESOLVIDA (registrada em
 * docs/backend-implementation/19-decisions.md): o Prompt 5B (seção 37) pede
 * um formato de erro com campos {code, message, details, fieldErrors,
 * correlationId, timestamp, path}, mas a especificação de API já oficial
 * (docs/api/17-errors.md) define RFC 9457 Problem Details
 * {type, title, status, detail, instance, code, correlationId, fieldErrors,
 * meta}. Por instrução explícita de não redefinir contratos já aprovados,
 * o formato de saída real desta implementação é RFC 9457 (já aprovado e
 * possivelmente já consumido por outras camadas/documentos), com o campo
 * `timestamp` ADICIONADO como membro de extensão (RFC 9457 permite membros
 * extras) para atender à exigência do Prompt 5B sem quebrar o contrato
 * oficial. `message`≈`detail`, `details`≈`meta`, `path`≈`instance` — mesma
 * informação, nomes já fixados por docs/api/17-errors.md.
 */

export type AppErrorCode =
  | 'MALFORMED_REQUEST'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'SESSION_REVOKED'
  | 'MFA_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'DUPLICATE_CNJ'
  | 'STALE_VERSION'
  | 'HAS_ACTIVE_LEGAL_CASES'
  | 'LAST_OWNER'
  | 'SELF_ESCALATION_FORBIDDEN'
  | 'ALREADY_ACCEPTED'
  | 'LAST_AUTH_METHOD'
  | 'INVALID_CHECK_DIGIT'
  | 'JUSTIFICATION_REQUIRED'
  | 'SYSTEM_EVENT_NOT_DELETABLE'
  | 'TYPE_NOT_MANUAL'
  | 'FILE_TOO_LARGE'
  | 'MIME_NOT_ALLOWED'
  | 'AI_QUOTA_EXCEEDED'
  | 'GENERATION_IN_PROGRESS'
  | 'FILE_INFECTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'FOLDER_NOT_EMPTY'
  | 'CIRCULAR_REFERENCE'
  | 'MAX_DEPTH_EXCEEDED'
  | 'UPLOAD_NOT_PENDING'
  | 'UPLOAD_EXPIRED'
  | 'HASH_MISMATCH'
  | 'GENERATION_TIMEOUT'
  | 'ROLE_IN_USE'
  | 'DUPLICATE_NAME'
  | 'TASK_DEPENDENCIES_PENDING'
  | 'TASK_CHECKLIST_PENDING';

export const ERROR_STATUS_MAP: Record<AppErrorCode, number> = {
  MALFORMED_REQUEST: 400,
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  SESSION_REVOKED: 401,
  MFA_REQUIRED: 202,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_ALREADY_EXISTS: 409,
  DUPLICATE_CNJ: 409,
  STALE_VERSION: 409,
  HAS_ACTIVE_LEGAL_CASES: 409,
  LAST_OWNER: 409,
  SELF_ESCALATION_FORBIDDEN: 403,
  ALREADY_ACCEPTED: 409,
  LAST_AUTH_METHOD: 409,
  INVALID_CHECK_DIGIT: 422,
  JUSTIFICATION_REQUIRED: 422,
  SYSTEM_EVENT_NOT_DELETABLE: 403,
  TYPE_NOT_MANUAL: 422,
  FILE_TOO_LARGE: 422,
  MIME_NOT_ALLOWED: 422,
  AI_QUOTA_EXCEEDED: 402,
  GENERATION_IN_PROGRESS: 409,
  FILE_INFECTED: 423,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  AI_PROVIDER_UNAVAILABLE: 503,
  STORAGE_UNAVAILABLE: 503,
  FOLDER_NOT_EMPTY: 409,
  CIRCULAR_REFERENCE: 422,
  MAX_DEPTH_EXCEEDED: 422,
  UPLOAD_NOT_PENDING: 409,
  UPLOAD_EXPIRED: 410,
  HASH_MISMATCH: 422,
  GENERATION_TIMEOUT: 504,
  ROLE_IN_USE: 409,
  DUPLICATE_NAME: 409,
  TASK_DEPENDENCIES_PENDING: 409,
  TASK_CHECKLIST_PENDING: 409,
};

export const ERROR_TITLE_MAP: Record<AppErrorCode, string> = {
  MALFORMED_REQUEST: 'Requisição malformada',
  UNAUTHENTICATED: 'Não autenticado',
  TOKEN_EXPIRED: 'Sessão expirada',
  SESSION_REVOKED: 'Sessão revogada',
  MFA_REQUIRED: 'Verificação adicional necessária',
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  ACCOUNT_LOCKED: 'Conta temporariamente bloqueada',
  FORBIDDEN: 'Ação não permitida',
  NOT_FOUND: 'Recurso não encontrado',
  EMAIL_ALREADY_EXISTS: 'E-mail já cadastrado',
  DUPLICATE_CNJ: 'Número de processo já cadastrado',
  STALE_VERSION: 'Registro foi atualizado por outra pessoa',
  HAS_ACTIVE_LEGAL_CASES: 'Cliente possui processos ativos',
  LAST_OWNER: 'Escritório precisa de ao menos um Owner ativo',
  SELF_ESCALATION_FORBIDDEN: 'Não é possível alterar o próprio papel',
  ALREADY_ACCEPTED: 'Convite já foi aceito',
  LAST_AUTH_METHOD: 'Último método de autenticação não pode ser removido',
  INVALID_CHECK_DIGIT: 'Dígito verificador inválido',
  JUSTIFICATION_REQUIRED: 'Justificativa obrigatória',
  SYSTEM_EVENT_NOT_DELETABLE: 'Evento do sistema não pode ser alterado',
  TYPE_NOT_MANUAL: 'Tipo de evento não pode ser criado manualmente',
  FILE_TOO_LARGE: 'Arquivo excede o tamanho máximo',
  MIME_NOT_ALLOWED: 'Tipo de arquivo não suportado',
  AI_QUOTA_EXCEEDED: 'Cota de IA do escritório atingida',
  GENERATION_IN_PROGRESS: 'Já existe uma geração em andamento',
  FILE_INFECTED: 'Arquivo bloqueado por segurança',
  RATE_LIMITED: 'Muitas requisições',
  INTERNAL_ERROR: 'Erro interno',
  AI_PROVIDER_UNAVAILABLE: 'Provedor de IA indisponível',
  STORAGE_UNAVAILABLE: 'Armazenamento indisponível',
  FOLDER_NOT_EMPTY: 'Pasta não está vazia',
  CIRCULAR_REFERENCE: 'Movimentação criaria uma referência circular',
  MAX_DEPTH_EXCEEDED: 'Profundidade máxima de pastas excedida',
  UPLOAD_NOT_PENDING: 'Upload não está pendente',
  UPLOAD_EXPIRED: 'Upload expirado ou não encontrado',
  HASH_MISMATCH: 'Hash do arquivo não confere',
  GENERATION_TIMEOUT: 'Geração de IA demorou demais e foi interrompida',
  ROLE_IN_USE: 'Perfil atribuído a membros ativos',
  DUPLICATE_NAME: 'Já existe um registro com este nome neste escritório',
  TASK_DEPENDENCIES_PENDING: 'Existem dependências não concluídas bloqueando esta tarefa',
  TASK_CHECKLIST_PENDING: 'Existem itens de checklist obrigatórios não concluídos',
};
