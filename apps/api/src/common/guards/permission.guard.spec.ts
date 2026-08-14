import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '../../shared/domain/result';
import { PermissionGuard } from './permission.guard';

function buildContext(
  permissions: string[],
  requiredPermission?: string,
): {
  context: ExecutionContext;
  reflector: Reflector;
} {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermission);

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ authUser: { permissions } }),
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('PermissionGuard', () => {
  it('permite quando a rota não declara @RequirePermission', () => {
    const { context, reflector } = buildContext([], undefined);
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando o usuário tem a permissão exata', () => {
    const { context, reflector } = buildContext(['case:read:assigned'], 'case:read:assigned');
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando o usuário tem escopo ALL do mesmo recurso:ação', () => {
    const { context, reflector } = buildContext(['case:read:all'], 'case:read:assigned');
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('nega (FORBIDDEN) quando o usuário não tem a permissão', () => {
    const { context, reflector } = buildContext(['client:read'], 'case:delete');
    const guard = new PermissionGuard(reflector);
    expect(() => guard.canActivate(context)).toThrow(DomainError);
    try {
      guard.canActivate(context);
    } catch (err) {
      expect((err as DomainError).code).toBe('FORBIDDEN');
    }
  });
});
