import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  UpdateRolePermissionsUseCase,
  UpdateRoleUseCase,
} from './role-lifecycle.use-cases';

function buildPrisma() {
  return {
    client: {
      permissao: { findMany: jest.fn() },
      membro: { findFirst: jest.fn(), count: jest.fn() },
      papel: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      papelPermissao: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    },
  };
}

describe('CreateRoleUseCase', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  beforeEach(() => (prisma = buildPrisma()));

  it('nega (teto de privilégio) quando o ator tenta conceder uma permissão que ele mesmo não tem', async () => {
    const result = await new CreateRoleUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-1',
      ['client:read'], // ator só tem client:read
      { nome: 'Perfil Novo', permissoes: ['case:read:confidential'] },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(prisma.client.papel.create).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando alguma permissão solicitada não existe no catálogo', async () => {
    prisma.client.permissao.findMany.mockResolvedValue([{ id: 'p1', chave: 'client:read' }]); // só 1 de 2

    const result = await new CreateRoleUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-1',
      ['client:read', 'chave:inexistente'],
      { nome: 'Perfil Novo', permissoes: ['client:read', 'chave:inexistente'] },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('cria o papel um nível abaixo do papel do ator, nunca no mesmo nível ou acima', async () => {
    prisma.client.permissao.findMany.mockResolvedValue([{ id: 'p1', chave: 'client:read' }]);
    prisma.client.membro.findFirst.mockResolvedValue({ papel: { nivel: 70 } });
    prisma.client.papel.create.mockResolvedValue({ id: 'papel-novo' });

    const result = await new CreateRoleUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-1',
      ['client:read'],
      { nome: 'Perfil Novo', permissoes: ['client:read'] },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.papel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nivel: 69,
          ehSistema: false,
          escritorioId: 'escritorio-1',
        }),
      }),
    );
  });
});

describe('UpdateRoleUseCase', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  beforeEach(() => (prisma = buildPrisma()));

  it('nega renomear um papel de sistema', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: true });

    const result = await new UpdateRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1', {
      nome: 'Novo nome',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('renomeia um papel customizado', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: false });

    const result = await new UpdateRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1', {
      nome: 'Novo nome',
    });

    expect(result.ok).toBe(true);
    expect(prisma.client.papel.update).toHaveBeenCalled();
  });
});

describe('UpdateRolePermissionsUseCase', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  beforeEach(() => (prisma = buildPrisma()));

  it('nega editar as permissões de um papel de sistema', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: true });

    const result = await new UpdateRolePermissionsUseCase(prisma as never).execute(
      'escritorio-1',
      'papel-1',
      ['client:read'],
      { permissoes: ['client:read'] },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('nega (teto de privilégio) conceder uma permissão que o ator não tem', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: false });

    const result = await new UpdateRolePermissionsUseCase(prisma as never).execute(
      'escritorio-1',
      'papel-1',
      ['client:read'],
      { permissoes: ['case:delete'] },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('substitui o conjunto de permissões do papel customizado', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: false });
    prisma.client.permissao.findMany.mockResolvedValue([{ id: 'p1', chave: 'client:read' }]);

    const result = await new UpdateRolePermissionsUseCase(prisma as never).execute(
      'escritorio-1',
      'papel-1',
      ['client:read'],
      { permissoes: ['client:read'] },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.papelPermissao.deleteMany).toHaveBeenCalledWith({
      where: { papelId: 'papel-1' },
    });
    expect(prisma.client.papelPermissao.createMany).toHaveBeenCalledWith({
      data: [{ papelId: 'papel-1', permissaoId: 'p1' }],
    });
  });
});

describe('DeleteRoleUseCase', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  beforeEach(() => (prisma = buildPrisma()));

  it('nega excluir um papel de sistema', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: true });

    const result = await new DeleteRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('nega (ROLE_IN_USE) excluir um papel customizado que ainda tem membros', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: false });
    prisma.client.membro.count.mockResolvedValue(2);

    const result = await new DeleteRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ROLE_IN_USE');
    expect(prisma.client.papel.delete).not.toHaveBeenCalled();
  });

  it('exclui um papel customizado sem membros atribuídos', async () => {
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-1', ehSistema: false });
    prisma.client.membro.count.mockResolvedValue(0);

    const result = await new DeleteRoleUseCase(prisma as never).execute('escritorio-1', 'papel-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.papel.delete).toHaveBeenCalledWith({ where: { id: 'papel-1' } });
  });
});
