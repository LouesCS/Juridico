import { CreateLegalCaseUseCase } from './create-legal-case.use-case';

const CNJ_VALIDO = '1234567-19.2024.8.26.0001';

describe('CreateLegalCaseUseCase', () => {
  const tx = {
    $queryRaw: jest.fn(),
    processo: { create: jest.fn() },
    processoMembro: { create: jest.fn() },
    pastaJuridicaProcesso: { findFirst: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    client: {
      cliente: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new CreateLegalCaseUseCase(prisma as never, timeline as never);
  }

  function baseDto(overrides: Record<string, unknown> = {}) {
    return {
      titulo: 'Ação de cobrança',
      clienteId: 'cliente-1',
      pastaJuridicaId: '11111111-1111-4111-8111-111111111111',
      area: 'Cível',
      tipo: 'JUDICIAL',
      poloCliente: 'ATIVO',
      status: 'ATIVO',
      prioridade: 'MEDIA',
      segredoJustica: false,
      responsavelPrincipalId: 'membro-1',
      ...overrides,
    } as never;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.membro.findFirst.mockResolvedValue({ id: 'membro-1' });
    prisma.client.processo.findFirst.mockResolvedValue(null);
    tx.processo.create.mockResolvedValue({ id: 'processo-novo' });
    tx.$queryRaw.mockResolvedValue([{ cliente_principal_id: 'cliente-1' }]);
    tx.pastaJuridicaProcesso.findFirst.mockResolvedValue(null);
  });

  it('rejeita criação fora da Pasta Jurídica', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      baseDto({ pastaJuridicaId: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LEGAL_FOLDER_REQUIRED');
    expect(tx.processo.create).not.toHaveBeenCalled();
  });

  it('rejeita CNJ com dígito verificador inválido (INVALID_CHECK_DIGIT)', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      baseDto({ numeroCnj: '12345671920248260099' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CHECK_DIGIT');
    expect(tx.processo.create).not.toHaveBeenCalled();
  });

  it('rejeita número CNJ já cadastrado no escritório (DUPLICATE_CNJ)', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({ id: 'processo-existente' });

    const result = await buildUseCase().execute('escritorio-1', baseDto({ numeroCnj: CNJ_VALIDO }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DUPLICATE_CNJ');
      expect(result.error.meta).toEqual({ processoExistenteId: 'processo-existente' });
    }
  });

  it('retorna NOT_FOUND quando o cliente não existe no escritório', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', baseDto());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND quando o advogado responsável não existe/não está ativo', async () => {
    prisma.client.membro.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', baseDto());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('cria o processo e já registra o responsável principal na equipe do processo', async () => {
    const result = await buildUseCase().execute('escritorio-1', baseDto({ numeroCnj: CNJ_VALIDO }));

    expect(result.ok).toBe(true);
    expect(tx.processo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ numeroCnj: '12345671920248260001' }),
      }),
    );
    expect(tx.processoMembro.create).toHaveBeenCalledWith({
      data: {
        processoId: 'processo-novo',
        membroId: 'membro-1',
        responsavelPrincipal: true,
        acessoPermitido: 'LEITURA_ESCRITA',
      },
    });
  });

  it('registra o evento CRIACAO_PROCESSO na Timeline após criar o processo', async () => {
    await buildUseCase().execute('escritorio-1', baseDto(), 'membro-1');

    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({
        escritorioId: 'escritorio-1',
        processoId: 'processo-novo',
        tipo: 'CRIACAO_PROCESSO',
        autorId: 'membro-1',
      }),
    );
  });

  it('cria Processo Judicial dentro da Pasta e mantém o vínculo na mesma transação', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      baseDto({ pastaJuridicaId: '11111111-1111-4111-8111-111111111111' }),
    );

    expect(result.ok).toBe(true);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.pastaJuridicaProcesso.create).toHaveBeenCalledWith({
      data: {
        pastaJuridicaId: '11111111-1111-4111-8111-111111111111',
        processoId: 'processo-novo',
      },
    });
  });

  it('impede segundo Processo do mesmo tipo depois de bloquear a Pasta', async () => {
    tx.pastaJuridicaProcesso.findFirst.mockResolvedValue({ processoId: 'processo-existente' });

    const result = await buildUseCase().execute(
      'escritorio-1',
      baseDto({ pastaJuridicaId: '11111111-1111-4111-8111-111111111111' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LEGAL_FOLDER_PROCESS_LIMIT');
      expect(result.error.message).toContain('crie uma nova Pasta');
    }
    expect(tx.processo.create).not.toHaveBeenCalled();
  });

  it('cria Processo Extrajudicial usando a mesma transação e vínculo da Pasta', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      baseDto({ tipo: 'EXTRAJUDICIAL', numeroCnj: undefined, titulo: 'Negociação administrativa' }),
    );

    expect(result.ok).toBe(true);
    expect(tx.pastaJuridicaProcesso.findFirst).toHaveBeenCalledWith({
      where: {
        pastaJuridicaId: '11111111-1111-4111-8111-111111111111',
        processo: { tipo: 'EXTRAJUDICIAL' },
      },
      select: { processoId: true },
    });
    expect(tx.processo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'EXTRAJUDICIAL', numeroCnj: undefined }),
      }),
    );
  });

  it('permite Judicial e Extrajudicial simultâneos porque o limite é por tipo', async () => {
    await buildUseCase().execute('escritorio-1', baseDto({ tipo: 'EXTRAJUDICIAL' }));
    expect(tx.pastaJuridicaProcesso.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ processo: { tipo: 'EXTRAJUDICIAL' } }),
      }),
    );
  });
});
