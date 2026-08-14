import { GetRoleUseCase, ListPermissionCatalogUseCase } from './permission-catalog.use-cases';

describe('ListPermissionCatalogUseCase', () => {
  it('lista o catálogo ordenado por categoria/recurso/ação', async () => {
    const prisma = {
      client: { permissao: { findMany: jest.fn().mockResolvedValue([{ chave: 'client:read' }]) } },
    };
    const result = await new ListPermissionCatalogUseCase(prisma as never).execute();

    expect(result).toEqual([{ chave: 'client:read' }]);
    expect(prisma.client.permissao.findMany).toHaveBeenCalledWith({
      orderBy: [{ categoria: 'asc' }, { recurso: 'asc' }, { acao: 'asc' }],
    });
  });
});

describe('GetRoleUseCase', () => {
  const prisma = { client: { papel: { findFirst: jest.fn() } } };

  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o papel não é de sistema nem deste escritório', async () => {
    prisma.client.papel.findFirst.mockResolvedValue(null);
    const result = await new GetRoleUseCase(prisma as never).execute('escritorio-1', 'papel-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('achata as permissões do papel em um array de chaves', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({
      id: 'papel-1',
      nome: 'GESTOR',
      descricao: null,
      nivel: 70,
      ehSistema: true,
      permissoes: [
        { permissao: { chave: 'client:read' } },
        { permissao: { chave: 'report:metrics:read' } },
      ],
    });

    const result = await new GetRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: 'papel-1',
        nome: 'GESTOR',
        permissoes: ['client:read', 'report:metrics:read'],
      });
    }
  });
});
