import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '../../shared/domain/result';
import { JwtAuthGuard } from './jwt-auth.guard';

function buildContext(
  request: Record<string, unknown>,
  isPublic: boolean | undefined,
): { context: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('JwtAuthGuard', () => {
  it('permite rota pública mesmo sem authUser', () => {
    const { context, reflector } = buildContext({}, true);
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando authUser já foi resolvido pelo middleware', () => {
    const { context, reflector } = buildContext({ authUser: { usuarioId: '1' } }, undefined);
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it.each([
    ['EXPIRED', 'TOKEN_EXPIRED'],
    ['REVOKED', 'SESSION_REVOKED'],
    ['INVALID', 'UNAUTHENTICATED'],
    ['MISSING', 'UNAUTHENTICATED'],
  ])('mapeia authError=%s para DomainError code=%s', (authError, expectedCode) => {
    const { context, reflector } = buildContext({ authError }, undefined);
    const guard = new JwtAuthGuard(reflector);
    try {
      guard.canActivate(context);
      fail('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe(expectedCode);
    }
  });
});
