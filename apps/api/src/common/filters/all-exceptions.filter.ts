import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppErrorCode, ERROR_STATUS_MAP, ERROR_TITLE_MAP } from '../errors/error-catalog';
import { DomainError } from '../../shared/domain/result';

/**
 * Estrutura única de erro — RFC 9457 (Problem Details), já oficial em
 * docs/api/17-errors.md, com `timestamp` como membro de extensão para
 * atender ao Prompt 5B §37 sem quebrar o contrato aprovado. Ver
 * docs/backend-implementation/19-decisions.md para o registro completo do
 * conflito e da resolução.
 *
 * Nunca expõe stack trace, SQL, nome de tabela interna ou detalhe de
 * infraestrutura — reafirma docs/api/17-errors.md §17.3 e Prompt 5B §48.
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  correlationId: string;
  timestamp: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
  meta?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId ?? 'unknown';
    const timestamp = new Date().toISOString();

    const problem = this.toProblemDetails(exception, request.path, correlationId, timestamp);

    if (problem.status >= 500) {
      this.logger.error(
        `${problem.code} — ${problem.detail} [correlationId=${correlationId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(problem.status).json(problem);
  }

  private toProblemDetails(
    exception: unknown,
    path: string,
    correlationId: string,
    timestamp: string,
  ): ProblemDetails {
    if (exception instanceof DomainError) {
      const code = exception.code as AppErrorCode;
      return {
        type: `https://docs.quilombodev.com.br/errors/${code.toLowerCase().replace(/_/g, '-')}`,
        title: ERROR_TITLE_MAP[code] ?? 'Erro',
        status: ERROR_STATUS_MAP[code] ?? 400,
        detail: exception.message,
        instance: path,
        code,
        correlationId,
        timestamp,
        meta: exception.meta,
      };
    }

    if (exception instanceof ZodError) {
      return {
        type: 'https://docs.quilombodev.com.br/errors/malformed-request',
        title: ERROR_TITLE_MAP.MALFORMED_REQUEST,
        status: 422,
        detail: 'A requisição contém campos inválidos.',
        instance: path,
        code: 'MALFORMED_REQUEST',
        correlationId,
        timestamp,
        fieldErrors: exception.issues.map((issue) => ({
          field: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        type: 'https://docs.quilombodev.com.br/errors/http-error',
        title: HttpStatus[status] ?? 'Erro',
        status,
        detail: exception.message,
        instance: path,
        code: 'INTERNAL_ERROR',
        correlationId,
        timestamp,
      };
    }

    // Falha não esperada — nunca vaza detalhe interno ao cliente.
    return {
      type: 'https://docs.quilombodev.com.br/errors/internal-error',
      title: ERROR_TITLE_MAP.INTERNAL_ERROR,
      status: 500,
      detail: 'Ocorreu um erro inesperado. Nossa equipe já foi notificada.',
      instance: path,
      code: 'INTERNAL_ERROR',
      correlationId,
      timestamp,
    };
  }
}
