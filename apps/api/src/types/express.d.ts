import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { AuthErrorReason } from '../common/middlewares/auth-context.middleware';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authError?: AuthErrorReason;
      correlationId: string;
      requestId: string;
    }
  }
}

export {};
