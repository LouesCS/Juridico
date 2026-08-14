import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { DomainError } from '../../shared/domain/result';
import { AUDIT_METADATA_KEY, AuditMetadata } from './audit-action.decorator';
import { AuditService } from './application/audit.service';
import { sanitizeForAudit } from './application/sanitize-for-audit';

type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
  correlationId: string;
  requestId?: string;
};

/**
 * Interceptor global (registrado via APP_INTERCEPTOR em AppModule) — só age
 * em handlers decorados com `@Audit(...)`; qualquer outra rota passa direto.
 * Reafirma PROMPT 5C Etapa 1: captura correlationId/requestId, ator, sessão,
 * IP, user agent, resultado (sucesso/falha/negado) e um recorte sanitizado
 * do corpo da requisição/resposta como metadados — nunca bloqueia a
 * resposta real por falha de auditoria (delegado a AuditService.registrar,
 * que engole a própria falha).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditMetadata | undefined>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );
    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Permission Engine (Prompt 12 §Simulador) — durante uma simulação
    // ativa, `atorId` continua sendo o USUÁRIO REAL (nunca o simulado: a
    // trilha de auditoria precisa sempre apontar para quem de fato agiu),
    // e `simulacao` registra ambos os membros para rastreabilidade.
    const simulacao = request.authUser?.simulacao
      ? {
          realMembroId: request.authUser.simulacao.realMembroId,
          membroSimuladoId: request.authUser.membroId,
        }
      : null;
    const baseFields = {
      acao: metadata.acao,
      recursoTipo: metadata.recursoTipo,
      correlationId: request.correlationId,
      ip: request.ip ?? null,
      userAgent: request.header('user-agent') ?? null,
      atorId: request.authUser?.simulacao?.realUsuarioId ?? request.authUser?.usuarioId ?? null,
      escritorioId: request.authUser?.escritorioId ?? null,
      sessaoId: request.authUser?.sessionId ?? null,
    };

    return next.handle().pipe(
      tap((response) => {
        const recursoDocumentoId =
          (request.params?.id as string | undefined) ?? this.extractId(response) ?? null;
        void this.auditService.registrar({
          ...baseFields,
          atorId: baseFields.atorId ?? this.extractId(response, 'usuario'),
          escritorioId:
            baseFields.escritorioId ??
            this.extractField(response, 'escritorioAtivoId') ??
            this.extractId(response, 'escritorio'),
          recursoId: recursoDocumentoId,
          resultado: 'SUCESSO',
          dadosDepois: response,
          metadados: {
            requestId: request.requestId,
            params: request.params,
            query: request.query,
            body: sanitizeForAudit(request.body),
            ...(simulacao ? { simulacao } : {}),
          },
        });
        const contextoId = metadata.contexto
          ? this.extractRequestField(
              metadata.contexto.recursoIdOrigem === 'body' ? request.body : request.params,
              metadata.contexto.recursoIdCampo,
            )
          : null;
        if (metadata.contexto && contextoId) {
          void this.auditService.registrar({
            ...baseFields,
            acao: metadata.contexto.acao,
            recursoTipo: metadata.contexto.recursoTipo,
            recursoId: contextoId,
            resultado: 'SUCESSO',
            metadados: {
              requestId: request.requestId,
              documentoId: recursoDocumentoId,
              ...(simulacao ? { simulacao } : {}),
            },
          });
        }
      }),
      catchError((err) => {
        const isDomainError = err instanceof DomainError;
        void this.auditService.registrar({
          ...baseFields,
          recursoId: (request.params?.id as string | undefined) ?? null,
          resultado: isDomainError && err.code === 'FORBIDDEN' ? 'NEGADO' : 'FALHA',
          motivo: isDomainError
            ? ((err.meta?.motivo as string | undefined) ?? err.message)
            : 'Erro inesperado',
          metadados: {
            requestId: request.requestId,
            params: request.params,
            query: request.query,
            body: sanitizeForAudit(request.body),
            code: isDomainError ? err.code : 'INTERNAL_ERROR',
            ...(simulacao ? { simulacao } : {}),
          },
        });
        throw err;
      }),
    );
  }

  private extractId(value: unknown, nestedKey?: string): string | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const target = nestedKey ? (record[nestedKey] as Record<string, unknown> | undefined) : record;
    const id = target?.['id'];
    return typeof id === 'string' ? id : null;
  }

  private extractField(value: unknown, key: string): string | null {
    if (!value || typeof value !== 'object') return null;
    const field = (value as Record<string, unknown>)[key];
    return typeof field === 'string' ? field : null;
  }

  private extractRequestField(value: unknown, key: string): string | null {
    if (!value || typeof value !== 'object') return null;
    const field = (value as Record<string, unknown>)[key];
    return typeof field === 'string' ? field : null;
  }
}
