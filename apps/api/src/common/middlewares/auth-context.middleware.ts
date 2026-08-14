import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthUser } from '../decorators/current-user.decorator';
import { RedisService } from '../../shared/infrastructure/cache/redis.service';
import { TenantContextStorage } from '../../shared/infrastructure/database/tenant-context';
import { TokenService } from '../../shared/infrastructure/security/token.service';

export type AuthErrorReason = 'MISSING' | 'INVALID' | 'EXPIRED' | 'REVOKED';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
    authError?: AuthErrorReason;
  }
}

/**
 * Estabelece o TenantContext (AsyncLocalStorage) envolvendo `next()` — é a
 * única forma correta de propagar contexto através da cadeia assíncrona de
 * Express/Nest (reafirma o padrão canônico do próprio Node para
 * AsyncLocalStorage). Guards downstream (JwtAuthGuard/PermissionGuard)
 * apenas *impõem* a decisão; este middleware apenas *estabelece* o contexto.
 * Ver decisão registrada em docs/backend-implementation/19-decisions.md.
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);

    if (!token) {
      req.authError = 'MISSING';
      return next();
    }

    try {
      const claims = this.tokenService.verifyAccessToken(token);

      const revoked = await this.redisService.isSessionRevoked(claims.sessionId);
      if (revoked) {
        req.authError = 'REVOKED';
        return next();
      }

      req.authUser = {
        usuarioId: claims.sub,
        membroId: claims.membroId,
        escritorioId: claims.tenantId,
        sessionId: claims.sessionId,
        roles: claims.roles,
        permissions: claims.permissions,
      };

      return TenantContextStorage.run(
        {
          usuarioId: claims.sub,
          escritorioId: claims.tenantId,
          membroId: claims.membroId,
          sessionId: claims.sessionId,
          roles: claims.roles,
          permissions: claims.permissions,
          correlationId: req.correlationId,
        },
        () => next(),
      );
    } catch (err) {
      const name = (err as { name?: string }).name;
      req.authError = name === 'TokenExpiredError' ? 'EXPIRED' : 'INVALID';
      return next();
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }
    const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.[
      'access_token'
    ];
    return cookieToken ?? null;
  }
}
