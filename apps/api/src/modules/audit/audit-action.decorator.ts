import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'auditAction';

export interface AuditMetadata {
  acao: string;
  recursoTipo: string;
  contexto?: {
    acao: string;
    recursoTipo: string;
    recursoIdOrigem: 'body' | 'params';
    recursoIdCampo: string;
  };
}

/**
 * Marca um handler para ser auditado pelo `AuditInterceptor` (global,
 * registrado em `AppModule`). Rotas sem este decorator não geram log de
 * auditoria — reafirma PROMPT 5C Etapa 1. `acao` é o mesmo para sucesso e
 * falha (ex.: 'LOGIN'); o resultado real (SUCESSO/FALHA/NEGADO) é resolvido
 * pelo interceptor a partir do desfecho da requisição.
 */
export const Audit = (
  acao: string,
  recursoTipo: string,
  contexto?: AuditMetadata['contexto'],
) => SetMetadata(AUDIT_METADATA_KEY, { acao, recursoTipo, contexto } satisfies AuditMetadata);
