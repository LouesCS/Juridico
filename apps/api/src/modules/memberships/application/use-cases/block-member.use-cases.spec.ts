import { BlockMemberUseCase, UnblockMemberUseCase } from './block-member.use-cases';

function buildPrisma() {
  const txClient = {
    usuario: { update: jest.fn() },
    sessao: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    client: {
      membro: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn() },
      usuario: { update: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(txClient)),
    },
    __txClient: txClient,
  };
}

describe('BlockMemberUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o colaborador não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(null);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new BlockMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NO_ACCESS quando o colaborador não tem conta de acesso (usuarioId nulo)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      nome: 'Ana',
      papel: { nome: 'ADVOGADO' },
    });
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new BlockMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_ACCESS');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });

  it('impede bloquear o último OWNER ativo', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      nome: 'Ana',
      papel: { nome: 'OWNER' },
    });
    prisma.client.membro.count.mockResolvedValue(0);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new BlockMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LAST_OWNER');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });

  it('bloqueia o acesso, revoga sessões ativas e grava a Timeline', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      nome: 'Ana',
      papel: { nome: 'ADVOGADO' },
    });
    prisma.__txClient.sessao.findMany.mockResolvedValue([{ id: 'sessao-1' }, { id: 'sessao-2' }]);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new BlockMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(true);
    expect(prisma.__txClient.usuario.update).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      data: { status: 'BLOQUEADO' },
    });
    expect(redisService.revokeSession).toHaveBeenCalledTimes(2);
    expect(redisService.revokeSession).toHaveBeenCalledWith('sessao-1', 60 * 60 * 24);
    expect(redisService.revokeSession).toHaveBeenCalledWith('sessao-2', 60 * 60 * 24);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_BLOQUEADO', membroId: 'membro-1' }),
    );
  });
});

describe('UnblockMemberUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NO_ACCESS quando o colaborador não tem conta de acesso', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      nome: 'Ana',
    });
    const timeline = { record: jest.fn() };

    const result = await new UnblockMemberUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_ACCESS');
  });

  it('desbloqueia o acesso (Usuario.status volta para ATIVO)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      nome: 'Ana',
    });
    const timeline = { record: jest.fn() };

    const result = await new UnblockMemberUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.usuario.update).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      data: { status: 'ATIVO' },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_DESBLOQUEADO' }),
    );
  });
});
