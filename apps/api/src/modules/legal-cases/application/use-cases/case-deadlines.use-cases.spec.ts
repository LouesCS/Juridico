import {
  CancelCaseDeadlineUseCase,
  CompleteCaseDeadlineUseCase,
  DuplicateCaseDeadlineUseCase,
  ReopenCaseDeadlineUseCase,
} from './case-deadlines.use-cases';

describe('CancelCaseDeadlineUseCase', () => {
  const prisma = {
    client: {
      prazo: { findFirst: jest.fn(), update: jest.fn() },
    },
  };

  function buildUseCase() {
    return new CancelCaseDeadlineUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('exige justificativa para cancelar prazo FATAL (JUSTIFICATION_REQUIRED)', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({ id: 'prazo-1', tipo: 'FATAL' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1', {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('JUSTIFICATION_REQUIRED');
    expect(prisma.client.prazo.update).not.toHaveBeenCalled();
  });

  it('cancela prazo FATAL quando a justificativa é informada', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({ id: 'prazo-1', tipo: 'FATAL' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1', {
      motivoCancelamento: 'Processo extinto por acordo entre as partes.',
    });

    expect(result.ok).toBe(true);
    expect(prisma.client.prazo.update).toHaveBeenCalledWith({
      where: { id: 'prazo-1' },
      data: {
        status: 'CANCELADO',
        motivoCancelamento: 'Processo extinto por acordo entre as partes.',
      },
    });
  });

  it('não exige justificativa para cancelar prazo não-fatal', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({ id: 'prazo-1', tipo: 'TAREFA' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1', {});

    expect(result.ok).toBe(true);
  });

  it('retorna NOT_FOUND quando o prazo não existe no processo/escritório', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-x', {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('CompleteCaseDeadlineUseCase', () => {
  const prisma = { client: { prazo: { findFirst: jest.fn(), update: jest.fn() } } };

  function buildUseCase() {
    return new CompleteCaseDeadlineUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('marca o prazo como CONCLUIDO com a data de conclusão preenchida', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({ id: 'prazo-1' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.prazo.update).toHaveBeenCalledWith({
      where: { id: 'prazo-1' },
      data: { status: 'CONCLUIDO', dataConclusao: expect.any(Date) },
    });
  });

  it('retorna NOT_FOUND quando o prazo não existe', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('ReopenCaseDeadlineUseCase', () => {
  const prisma = { client: { prazo: { findFirst: jest.fn(), update: jest.fn() } } };

  function buildUseCase() {
    return new ReopenCaseDeadlineUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('volta o prazo para PENDENTE, limpando conclusão e motivo de cancelamento', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({ id: 'prazo-1' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.prazo.update).toHaveBeenCalledWith({
      where: { id: 'prazo-1' },
      data: { status: 'PENDENTE', dataConclusao: null, motivoCancelamento: null },
    });
  });
});

describe('DuplicateCaseDeadlineUseCase', () => {
  const prisma = { client: { prazo: { findFirst: jest.fn(), create: jest.fn() } } };

  function buildUseCase() {
    return new DuplicateCaseDeadlineUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('cria uma cópia do prazo com "(cópia)" no título, no mesmo processo', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue({
      id: 'prazo-1',
      titulo: 'Audiência',
      descricao: null,
      tipo: 'AUDIENCIA',
      dataVencimento: new Date('2026-08-10T00:00:00.000Z'),
      horaVencimento: null,
      responsavelId: 'membro-1',
      prioridade: 'ALTA',
    });
    prisma.client.prazo.create.mockResolvedValue({ id: 'prazo-copia' });

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.prazo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ titulo: 'Audiência (cópia)', processoId: 'processo-1' }),
      }),
    );
  });

  it('retorna NOT_FOUND quando o prazo original não existe', async () => {
    prisma.client.prazo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', 'prazo-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
