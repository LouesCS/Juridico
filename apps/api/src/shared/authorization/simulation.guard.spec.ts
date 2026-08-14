import { ExecutionContext } from '@nestjs/common';
import { DomainError } from '../domain/result';
import { PermissionResolverService } from './permission-resolver.service';
import { SimulationGuard } from './simulation.guard';

function buildContext(
  headerValue: string | undefined,
  authUser: Record<string, unknown> | undefined,
) {
  const request: Record<string, unknown> = {
    authUser,
    header: (name: string) => (name === 'x-simulate-membro-id' ? headerValue : undefined),
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('SimulationGuard', () => {
  const prisma = { client: { membro: { findFirst: jest.fn() } } };
  const permissionResolver = { resolveEffectivePermissions: jest.fn() };

  function buildGuard() {
    return new SimulationGuard(
      prisma as never,
      permissionResolver as unknown as PermissionResolverService,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('deixa passar sem alterar nada quando não há req.authUser (autenticação ainda será decidida por JwtAuthGuard)', async () => {
    const { context } = buildContext('membro-alvo', undefined);
    await expect(buildGuard().canActivate(context)).resolves.toBe(true);
  });

  it('deixa passar sem alterar nada quando o header de simulação não está presente', async () => {
    const authUser = {
      usuarioId: 'u1',
      membroId: 'm1',
      escritorioId: 'e1',
      permissions: ['office:read'],
    };
    const { context, request } = buildContext(undefined, authUser);

    await expect(buildGuard().canActivate(context)).resolves.toBe(true);
    expect(request.authUser).toBe(authUser); // objeto intocado
    expect(prisma.client.membro.findFirst).not.toHaveBeenCalled();
  });

  it('nega (FORBIDDEN) quando o usuário real não tem simulation:use', async () => {
    const authUser = {
      usuarioId: 'u1',
      membroId: 'm1',
      escritorioId: 'e1',
      permissions: ['office:read'],
    };
    const { context } = buildContext('membro-alvo', authUser);

    await expect(buildGuard().canActivate(context)).rejects.toThrow(DomainError);
    await expect(buildGuard().canActivate(context)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('nega (NOT_FOUND) quando o membro alvo não existe, está inativo, ou é de outro escritório', async () => {
    const authUser = {
      usuarioId: 'u1',
      membroId: 'm1',
      escritorioId: 'e1',
      permissions: ['simulation:use'],
    };
    const { context } = buildContext('membro-alvo', authUser);
    prisma.client.membro.findFirst.mockResolvedValue(null);

    await expect(buildGuard().canActivate(context)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(prisma.client.membro.findFirst).toHaveBeenCalledWith({
      where: { id: 'membro-alvo', escritorioId: 'e1', status: 'ATIVO' },
      include: { papel: true },
    });
  });

  it('substitui membroId/roles/permissions pelo do membro simulado, preservando o ator real para auditoria', async () => {
    const authUser = {
      usuarioId: 'owner-1',
      membroId: 'membro-owner',
      escritorioId: 'e1',
      permissions: ['simulation:use', 'office:update'],
    };
    const { context, request } = buildContext('membro-estagiario', authUser);
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-estagiario',
      papelId: 'papel-estagiario',
      papel: { nome: 'ESTAGIARIO' },
    });
    permissionResolver.resolveEffectivePermissions.mockResolvedValue([
      'client:read',
      'ai:summarize',
    ]);

    await buildGuard().canActivate(context);

    const finalUser = request.authUser as Record<string, unknown>;
    expect(finalUser.membroId).toBe('membro-estagiario');
    expect(finalUser.roles).toEqual(['ESTAGIARIO']);
    expect(finalUser.permissions).toEqual(['client:read', 'ai:summarize']);
    expect(finalUser.simulacao).toEqual({ realUsuarioId: 'owner-1', realMembroId: 'membro-owner' });
    // Nunca eleva além do que o membro simulado realmente tem — mesmo o
    // ator real sendo OWNER, `office:update` (que só o ator real tinha)
    // não sobrevive à simulação.
    expect(finalUser.permissions).not.toContain('office:update');
  });
});
