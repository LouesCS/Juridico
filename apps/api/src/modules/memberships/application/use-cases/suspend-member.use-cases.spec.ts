import { SuspendMemberUseCase, UnsuspendMemberUseCase } from './suspend-member.use-cases';

function buildPrisma() {
  const txClient = {
    membro: { update: jest.fn() },
    sessao: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    client: {
      membro: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(txClient)),
    },
    __txClient: txClient,
  };
}

describe('SuspendMemberUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o colaborador não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(null);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new SuspendMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('impede suspender o último OWNER ativo', async () => {
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

    const result = await new SuspendMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LAST_OWNER');
    expect(prisma.client.$transaction).not.toHaveBeenCalled();
  });

  it('suspende um colaborador SEM conta de acesso (não exige usuarioId)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      nome: 'Ana',
      papel: { nome: 'ADVOGADO' },
    });
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new SuspendMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(true);
    expect(prisma.__txClient.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-1' },
      data: { status: 'SUSPENSO' },
    });
    expect(redisService.revokeSession).not.toHaveBeenCalled();
  });

  it('suspende e revoga sessões ativas quando o colaborador tem conta', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      nome: 'Ana',
      papel: { nome: 'ADVOGADO' },
    });
    prisma.__txClient.sessao.findMany.mockResolvedValue([{ id: 'sessao-1' }]);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new SuspendMemberUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(true);
    expect(redisService.revokeSession).toHaveBeenCalledWith('sessao-1', 60 * 60 * 24);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_SUSPENSO' }),
    );
  });
});

describe('UnsuspendMemberUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_SUSPENDED quando o colaborador não está suspenso', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      status: 'ATIVO',
      nome: 'Ana',
    });
    const timeline = { record: jest.fn() };

    const result = await new UnsuspendMemberUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_SUSPENDED');
  });

  it('reativa o colaborador suspenso (status volta para ATIVO)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      status: 'SUSPENSO',
      nome: 'Ana',
    });
    const timeline = { record: jest.fn() };

    const result = await new UnsuspendMemberUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-1' },
      data: { status: 'ATIVO' },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_REATIVADO' }),
    );
  });
});
