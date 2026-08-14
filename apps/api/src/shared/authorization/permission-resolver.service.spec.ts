import { PermissionResolverService } from './permission-resolver.service';

describe('PermissionResolverService', () => {
  const prisma = {
    client: {
      papelPermissao: { findMany: jest.fn() },
      permissaoUsuario: { findMany: jest.fn() },
    },
  };

  function buildService() {
    return new PermissionResolverService(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna as permissões do papel quando não há overrides', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([
      { permissao: { chave: 'client:read' } },
      { permissao: { chave: 'case:read:all' } },
    ]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions.sort()).toEqual(['case:read:all', 'client:read']);
  });

  it('CONCEDER adiciona uma permissão que o papel não tinha', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([
      { permissao: { chave: 'client:read' } },
    ]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      { efeito: 'CONCEDER', expiraEm: null, permissao: { chave: 'ai:summarize' } },
    ]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions).toContain('ai:summarize');
  });

  it('NEGAR sempre vence CONCEDER do papel', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([
      { permissao: { chave: 'case:delete' } },
    ]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      { efeito: 'NEGAR', expiraEm: null, permissao: { chave: 'case:delete' } },
    ]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions).not.toContain('case:delete');
  });

  it('ignora um override CONCEDER já expirado (bug real corrigido nesta rodada)', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      {
        efeito: 'CONCEDER',
        expiraEm: new Date('2020-01-01T00:00:00.000Z'),
        permissao: { chave: 'ai:summarize' },
      },
    ]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions).not.toContain('ai:summarize');
  });

  it('ignora um override NEGAR já expirado — a permissão do papel volta a valer', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([
      { permissao: { chave: 'case:delete' } },
    ]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      {
        efeito: 'NEGAR',
        expiraEm: new Date('2020-01-01T00:00:00.000Z'),
        permissao: { chave: 'case:delete' },
      },
    ]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions).toContain('case:delete');
  });

  it('aplica um override CONCEDER com expiração futura normalmente', async () => {
    prisma.client.papelPermissao.findMany.mockResolvedValue([]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      {
        efeito: 'CONCEDER',
        expiraEm: new Date(Date.now() + 60_000),
        permissao: { chave: 'ai:summarize' },
      },
    ]);

    const permissions = await buildService().resolveEffectivePermissions('membro-1', 'papel-1');

    expect(permissions).toContain('ai:summarize');
  });
});
