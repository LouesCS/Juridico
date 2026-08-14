import {
  GrantAccessUseCase,
  RevokeAccessUseCase,
  RevokeAllSessionsUseCase,
} from './access-management.use-cases';

function buildPrisma() {
  const txClient = {
    usuario: { update: jest.fn() },
    sessao: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    client: {
      membro: { findFirst: jest.fn(), count: jest.fn(), update: jest.fn() },
      papel: { findFirst: jest.fn().mockResolvedValue({ id: 'papel-1' }) },
      sessao: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(txClient)),
    },
    __txClient: txClient,
  };
}

describe('GrantAccessUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o colaborador não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(null);
    const inviteMemberUseCase = { execute: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new GrantAccessUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-x', { papelId: 'papel-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna ALREADY_HAS_ACCESS quando o colaborador já tem usuarioId', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      email: 'ana@x.com',
      nome: 'Ana',
    });
    const inviteMemberUseCase = { execute: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new GrantAccessUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1', { papelId: 'papel-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ALREADY_HAS_ACCESS');
    expect(inviteMemberUseCase.execute).not.toHaveBeenCalled();
  });

  it('cria o convite vinculado ao membroId, usando o e-mail já cadastrado quando nenhum é informado', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      email: 'ana@x.com',
      nome: 'Ana',
    });
    const inviteMemberUseCase = { execute: jest.fn().mockResolvedValue({ id: 'convite-1' }) };
    const timeline = { record: jest.fn() };

    const result = await new GrantAccessUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1', { papelId: 'papel-1' });

    expect(result.ok).toBe(true);
    expect(inviteMemberUseCase.execute).toHaveBeenCalledWith(
      'escritorio-1',
      'ator-1',
      { email: 'ana@x.com', papelId: 'papel-1' },
      'membro-1',
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ACESSO_CONCEDIDO' }),
    );
  });

  it('atualiza o e-mail do colaborador quando um e-mail diferente é informado', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      email: 'antigo@x.com',
      nome: 'Ana',
    });
    const inviteMemberUseCase = { execute: jest.fn() };
    const timeline = { record: jest.fn() };

    await new GrantAccessUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1', { papelId: 'papel-1', email: 'novo@x.com' });

    expect(prisma.client.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-1' },
      data: { email: 'novo@x.com' },
    });
    expect(inviteMemberUseCase.execute).toHaveBeenCalledWith(
      'escritorio-1',
      'ator-1',
      { email: 'novo@x.com', papelId: 'papel-1' },
      'membro-1',
    );
  });
});

describe('RevokeAccessUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NO_ACCESS quando o colaborador não tem conta de acesso', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: null,
      nome: 'Ana',
    });
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new RevokeAccessUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_ACCESS');
  });

  it('impede revogar acesso do último OWNER ativo', async () => {
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

    const result = await new RevokeAccessUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LAST_OWNER');
  });

  it('bloqueia o Usuario SEM zerar usuarioId, revoga sessões e grava ACESSO_REMOVIDO', async () => {
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

    const result = await new RevokeAccessUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(true);
    expect(prisma.__txClient.usuario.update).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      data: { status: 'BLOQUEADO' },
    });
    // Nunca atualiza membro.usuarioId (Usuario é identidade global).
    expect(prisma.client.membro.update).not.toHaveBeenCalled();
    expect(redisService.revokeSession).toHaveBeenCalledWith('sessao-1', 60 * 60 * 24);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ACESSO_REMOVIDO' }),
    );
  });
});

describe('RevokeAllSessionsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NO_ACCESS quando o colaborador não tem conta de acesso', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({ id: 'membro-1', usuarioId: null });
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new RevokeAllSessionsUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_ACCESS');
  });

  it('só busca/revoga sessões escopadas a este escritório (escritorioAtivoId), nunca de outro', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuarioId: 'usuario-1',
      nome: 'Ana',
    });
    prisma.client.sessao.findMany.mockResolvedValue([{ id: 'sessao-1' }, { id: 'sessao-2' }]);
    const redisService = { revokeSession: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new RevokeAllSessionsUseCase(
      prisma as never,
      redisService as never,
      timeline as never,
    ).execute('escritorio-1', 'ator-1', 'membro-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.sessao.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 'usuario-1', escritorioAtivoId: 'escritorio-1', revogadaEm: null },
      select: { id: true },
    });
    expect(redisService.revokeSession).toHaveBeenCalledTimes(2);
    expect(prisma.client.sessao.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sessao-1', 'sessao-2'] } },
      data: { revogadaEm: expect.any(Date), motivoRevogacao: 'ADMIN' },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'SESSOES_REVOGADAS' }),
    );
  });
});
