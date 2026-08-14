import {
  AddCaseTeamMemberUseCase,
  ChangeCaseResponsibleUseCase,
  RemoveCaseTeamMemberUseCase,
} from './case-team.use-cases';

describe('AddCaseTeamMemberUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      processoMembro: { findFirst: jest.fn(), create: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new AddCaseTeamMemberUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('adiciona o membro à equipe e registra evento EQUIPE_ALTERADA na Timeline', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      usuario: { nome: 'Bruno' },
    });
    prisma.client.processoMembro.findFirst.mockResolvedValue(null);
    prisma.client.processoMembro.create.mockResolvedValue({ id: 'vinculo-novo' });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      { membroId: 'membro-2', acessoPermitido: 'LEITURA_ESCRITA' } as never,
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'EQUIPE_ALTERADA',
        titulo: 'Bruno adicionado à equipe',
        autorId: 'membro-1',
      }),
    );
  });

  it('não duplica vínculo nem registra novo evento quando o membro já está na equipe', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      usuario: { nome: 'Bruno' },
    });
    prisma.client.processoMembro.findFirst.mockResolvedValue({ id: 'vinculo-existente' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', {
      membroId: 'membro-2',
      acessoPermitido: 'LEITURA_ESCRITA',
    } as never);

    expect(result.ok).toBe(true);
    expect(prisma.client.processoMembro.create).not.toHaveBeenCalled();
    expect(timeline.record).not.toHaveBeenCalled();
  });
});

describe('ChangeCaseResponsibleUseCase', () => {
  const tx = {
    processo: { update: jest.fn() },
    processoMembro: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new ChangeCaseResponsibleUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o processo não existe', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'membro-2');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND quando o novo responsável não existe/não está ativo', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.membro.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'membro-2');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('atualiza o responsável do processo, adiciona à equipe e registra evento ALTERACAO_RESPONSAVEL', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      usuario: { nome: 'Bruno' },
    });
    tx.processoMembro.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      'membro-2',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(tx.processo.update).toHaveBeenCalledWith({
      where: { id: 'processo-1' },
      data: { responsavelPrincipalId: 'membro-2' },
    });
    expect(tx.processoMembro.updateMany).toHaveBeenCalledWith({
      where: { processoId: 'processo-1', responsavelPrincipal: true },
      data: { responsavelPrincipal: false },
    });
    expect(tx.processoMembro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ membroId: 'membro-2', responsavelPrincipal: true }),
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALTERACAO_RESPONSAVEL', autorId: 'membro-1' }),
    );
  });

  it('quando o novo responsável já está na equipe, apenas promove o vínculo existente', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      usuario: { nome: 'Bruno' },
    });
    tx.processoMembro.findFirst.mockResolvedValue({ id: 'vinculo-existente' });

    await buildUseCase().execute('escritorio-1', 'processo-1', 'membro-2');

    expect(tx.processoMembro.update).toHaveBeenCalledWith({
      where: { id: 'vinculo-existente' },
      data: { responsavelPrincipal: true },
    });
    expect(tx.processoMembro.create).not.toHaveBeenCalled();
  });
});

describe('RemoveCaseTeamMemberUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      processoMembro: { findFirst: jest.fn(), update: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new RemoveCaseTeamMemberUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('bloqueia remover o responsável principal da equipe', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'membro-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(prisma.client.processoMembro.update).not.toHaveBeenCalled();
    expect(timeline.record).not.toHaveBeenCalled();
  });

  it('remove (saída soft) um membro que não é o responsável principal e registra evento EQUIPE_ALTERADA', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({
      id: 'processo-1',
      responsavelPrincipalId: 'membro-1',
    });
    prisma.client.processoMembro.findFirst.mockResolvedValue({ id: 'vinculo-1' });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      'membro-2',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.processoMembro.update).toHaveBeenCalledWith({
      where: { id: 'vinculo-1' },
      data: { saiuEm: expect.any(Date) },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'EQUIPE_ALTERADA', autorId: 'membro-1' }),
    );
  });
});
