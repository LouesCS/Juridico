import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId: string;
    requestId: string;
  }
}

/**
 * Reafirma docs/api/01-convencoes.md §1.10: X-Request-Id (uma requisição) vs
 * X-Correlation-Id (toda a cadeia de uma operação de negócio, propagado a
 * jobs/eventos). Ambos ecoados na resposta.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.header('X-Correlation-Id') as string) || randomUUID();
    const requestId = randomUUID();

    req.correlationId = correlationId;
    req.requestId = requestId;

    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
