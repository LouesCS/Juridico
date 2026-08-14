import { ArchiveLegalCaseUseCase, RestoreLegalCaseUseCase } from './legal-case-lifecycle.use-cases';

describe('ArchiveLegalCaseUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn(), update: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('arquiva o processo e registra evento ARQUIVAMENTO na Timeline', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({ id: 'processo-1' });

    const result = await new ArchiveLegalCaseUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'processo-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.processo.update).toHaveBeenCalledWith({
      where: { id: 'processo-1' },
      data: { status: 'ARQUIVADO', arquivadoEm: expect.any(Date) },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ARQUIVAMENTO', autorId: 'membro-1' }),
    );
  });

  it('retorna NOT_FOUND sem registrar evento quando o processo não existe', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await new ArchiveLegalCaseUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'processo-x',
    );

    expect(result.ok).toBe(false);
    expect(timeline.record).not.toHaveBeenCalled();
  });
});

describe('RestoreLegalCaseUseCase', () => {
  const prisma = {
    client: { $queryRaw: jest.fn(), $executeRaw: jest.fn() },
  };
  const timeline = { record: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('restaura o processo e registra evento RESTAURACAO na Timeline', async () => {
    prisma.client.$queryRaw.mockResolvedValue([{ id: 'processo-1' }]);

    const result = await new RestoreLegalCaseUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'processo-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'RESTAURACAO', autorId: 'membro-1' }),
    );
  });

  it('retorna NOT_FOUND sem registrar evento quando o processo não existe', async () => {
    prisma.client.$queryRaw.mockResolvedValue([]);

    const result = await new RestoreLegalCaseUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'processo-x',
    );

    expect(result.ok).toBe(false);
    expect(timeline.record).not.toHaveBeenCalled();
  });
});
