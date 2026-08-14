import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DomainError } from '../../shared/domain/result';
import { hasPermission } from '../../shared/authorization/permission-check';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Etapa 1 de 2 da autorização (ação) — reafirma docs/backend/06-autorizacao.md §6.1.
 * A etapa 2 (recurso — ownership, segredo de justiça, confidencialidade) é
 * responsabilidade da Policy do use case correspondente, nunca deste guard.
 *
 * NEGAR de PermissaoUsuario sempre vence CONCEDER do papel — essa resolução
 * já acontece na montagem de `permissions` no login/refresh (Identity), não
 * aqui; este guard apenas checa a lista final já resolvida.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const permissions = req.authUser?.permissions ?? [];

    // Reafirma docs/api/03-autorizacao.md §3.8 — regra de comparação
    // centralizada no Permission Engine (Prompt 12), única fonte para
    // qualquer checagem de permissão no backend.
    if (!hasPermission(permissions, requiredPermission)) {
      throw new DomainError('FORBIDDEN', 'Você não tem permissão para executar esta ação.');
    }

    return true;
  }
}
