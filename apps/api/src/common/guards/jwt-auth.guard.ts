import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DomainError } from '../../shared/domain/result';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Impõe a decisão de autenticação com base no que AuthContextMiddleware já
 * estabeleceu em req.authUser/req.authError — reafirma
 * docs/backend/05-autenticacao.md §5.3. Negar por padrão: rota sem
 * @Public() e sem authUser válido é sempre rejeitada.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();

    if (req.authUser) return true;

    switch (req.authError) {
      case 'EXPIRED':
        throw new DomainError(
          'TOKEN_EXPIRED',
          'Sua sessão expirou. Entre novamente para continuar.',
        );
      case 'REVOKED':
        throw new DomainError('SESSION_REVOKED', 'Esta sessão foi revogada.');
      case 'INVALID':
      case 'MISSING':
      default:
        throw new DomainError('UNAUTHENTICATED', 'Autenticação necessária.');
    }
  }
}
