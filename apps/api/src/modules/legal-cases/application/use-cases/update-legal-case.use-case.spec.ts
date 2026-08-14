import { UpdateLegalCaseUseCase } from './update-legal-case.use-case';

describe('UpdateLegalCaseUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn(), update: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new UpdateLegalCaseUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  function processoBase(overrides: Record<string, unknown> = {}) {
    return {
      id: 'p1',
      versao: 1,
      numeroCnj: null,
      status: 'ATIVO',
      prioridade: 'MEDIA',
      segredoJustica: false,
      dataDistribuicao: new Date('2026-01-10T00:00:00.000Z'),
      ...overrides,
    };
  }

  it('retorna STALE_VERSION quando a versão informada não bate com a atual', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase({ versao: 3 }));

    const result = await buildUseCase().execute('escritorio-1', 'p1', 2, {
      titulo: 'Novo',
    } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STALE_VERSION');
      expect(result.error.meta).toEqual({ versaoAtual: 3 });
    }
    expect(prisma.client.processo.update).not.toHaveBeenCalled();
    expect(timeline.record).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando o processo não existe no escritório', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'p1', 1, {} as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('aplica a atualização e incrementa a versão quando a versão confere', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    const result = await buildUseCase().execute('escritorio-1', 'p1', 1, {
      titulo: 'Título atualizado',
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.versao).toBe(2);
    expect(prisma.client.processo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ titulo: 'Título atualizado', versao: { increment: 1 } }),
      }),
    );
  });

  it('rejeita CNJ inválido na atualização sem gravar nada', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());

    const result = await buildUseCase().execute('escritorio-1', 'p1', 1, {
      numeroCnj: '12345671920248260099',
    } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CHECK_DIGIT');
    expect(prisma.client.processo.update).not.toHaveBeenCalled();
  });

  it('rejeita CNJ duplicado de outro processo do mesmo escritório', async () => {
    prisma.client.processo.findFirst
      .mockResolvedValueOnce(processoBase())
      .mockResolvedValueOnce({ id: 'p2' });

    const result = await buildUseCase().execute('escritorio-1', 'p1', 1, {
      numeroCnj: '1234567-19.2024.8.26.0001',
    } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_CNJ');
  });

  it('registra evento ALTERACAO_STATUS na Timeline quando o status muda', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase({ status: 'ATIVO' }));
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    await buildUseCase().execute(
      'escritorio-1',
      'p1',
      1,
      { status: 'SUSPENSO' } as never,
      'membro-1',
    );

    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALTERACAO_STATUS', autorId: 'membro-1' }),
    );
  });

  it('registra evento ALTERACAO_PRIORIDADE na Timeline quando a prioridade muda', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase({ prioridade: 'MEDIA' }));
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    await buildUseCase().execute('escritorio-1', 'p1', 1, { prioridade: 'ALTA' } as never);

    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALTERACAO_PRIORIDADE' }),
    );
  });

  it('registra evento SEGREDO_JUSTICA_ALTERADO quando o sigilo muda', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase({ segredoJustica: false }));
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    await buildUseCase().execute('escritorio-1', 'p1', 1, { segredoJustica: true } as never);

    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'SEGREDO_JUSTICA_ALTERADO' }),
    );
  });

  it('registra um único evento ATUALIZACAO_PROCESSO para campos que não têm evento dedicado', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    await buildUseCase().execute('escritorio-1', 'p1', 1, { titulo: 'Novo título' } as never);

    expect(timeline.record).toHaveBeenCalledTimes(1);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ATUALIZACAO_PROCESSO' }),
    );
  });

  it('não registra nenhum evento quando status/prioridade/segredo não mudam e não há outros campos', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });

    await buildUseCase().execute('escritorio-1', 'p1', 1, { status: 'ATIVO' } as never);

    expect(timeline.record).not.toHaveBeenCalled();
  });

  it('rejeita data de conclusão anterior à entrada', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());
    const result = await buildUseCase().execute('escritorio-1', 'p1', 1, {
      dataDistribuicao: '2026-01-10',
      dataEncerramento: '2026-01-09',
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DATE_RANGE');
    expect(prisma.client.processo.update).not.toHaveBeenCalled();
  });

  it('persiste os campos específicos do Extrajudicial sem alterar campos judiciais omitidos', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(processoBase());
    prisma.client.processo.update.mockResolvedValue({ versao: 2 });
    await buildUseCase().execute('escritorio-1', 'p1', 1, {
      numeroInterno: 'EXT-42',
      instituicao: 'INSS',
      numeroBeneficio: '000-1',
      dataDistribuicao: '2026-01-10',
      dataEncerramento: null,
    } as never);
    expect(prisma.client.processo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numeroInterno: 'EXT-42',
          instituicao: 'INSS',
          numeroBeneficio: '000-1',
          dataEncerramento: null,
        }),
      }),
    );
  });
});
