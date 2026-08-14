import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  usuarioId: string;
  membroId: string;
  escritorioId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  /**
   * Presente só durante uma simulação ativa (Permission Engine, Prompt 12
   * §Simulador — `SimulationGuard`) — `membroId`/`roles`/`permissions`
   * acima já são os do membro simulado; estes dois campos preservam quem
   * de fato está logado, para auditoria (nunca para autorização: a decisão
   * de autorização sempre usa os campos simulados acima, exatamente como o
   * membro real veria).
   */
  simulacao?: {
    realUsuarioId: string;
    realMembroId: string;
  };
}

/**
 * Extrai o usuário autenticado já resolvido pelo JwtAuthGuard/TenantGuard —
 * reafirma docs/backend/06-autorizacao.md §6.4.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request & { authUser: AuthUser }>();
    return request.authUser;
  },
);
