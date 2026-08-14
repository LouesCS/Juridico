import { AiSummaryService } from './ai-summary.service';
import { hashContent } from './context-hash';

function flushAsync(times = 15): Promise<void> {
  return times <= 0 ? Promise.resolve() : Promise.resolve().then(() => flushAsync(times - 1));
}

function fakeProvider(content = 'Resumo gerado.') {
  return {
    name: 'fake',
    generate: jest.fn(),
    async *generateStream() {
      yield { delta: content };
      return { content, modelo: 'mock-v1', tokensEntrada: 10, tokensSaida: 5, latenciaMs: 3 };
    },
    healthCheck: jest.fn(),
  };
}

function buildDeps(
  overrides: {
    resumoIA?: Record<string, jest.Mock>;
    provider?: ReturnType<typeof fakeProvider>;
  } = {},
) {
  const txClient = {
    resumoIA: {
      update: jest.fn().mockResolvedValue({}),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 'novo-resumo', ...data })),
      findFirst: jest.fn().mockResolvedValue(null),
      ...overrides.resumoIA,
    },
    fonteIA: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    client: {
      ...txClient,
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(txClient)),
    },
  };
  const registry = { getActive: jest.fn().mockReturnValue(overrides.provider ?? fakeProvider()) };
  const quota = {
    checkQuota: jest.fn().mockResolvedValue({ permitido: true, resumosGerados: 0, cotaMensal: 20 }),
  };
  const streamBus = { publish: jest.fn(), subscribe: jest.fn() };
  const timelineRecorder = { record: jest.fn() };

  return {
    prisma,
    registry,
    quota,
    streamBus,
    timelineRecorder,
    service: new AiSummaryService(
      prisma as never,
      registry as never,
      quota as never,
      streamBus as never,
      timelineRecorder as never,
    ),
  };
}

const user = { membroId: 'membro-1', escritorioId: 'escritorio-1', permissions: [] } as never;
const baseParams = {
  escritorioId: 'escritorio-1',
  escopoTipo: 'PROCESSO' as const,
  escopoId: 'processo-1',
  tipoResumo: 'GERAL' as const,
  templateId: 'resumo-processo-geral',
  user,
  contextResult: { promptContext: { campos: { Título: 'Ação X' } }, fontes: [] },
};

describe('AiSummaryService.requestSummary', () => {
  it('bloqueia com AI_QUOTA_EXCEEDED quando a cota do mês foi atingida', async () => {
    const { service, quota } = buildDeps();
    quota.checkQuota.mockResolvedValue({ permitido: false, resumosGerados: 20, cotaMensal: 20 });

    const result = await service.requestSummary(baseParams);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AI_QUOTA_EXCEEDED');
  });

  it('devolve o id em andamento em vez de criar uma segunda geração (idempotência de GERANDO)', async () => {
    const { service, prisma } = buildDeps({
      resumoIA: {
        findFirst: jest.fn().mockResolvedValue({ id: 'em-andamento', status: 'GERANDO' }),
      },
    });

    const result = await service.requestSummary(baseParams);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ id: 'em-andamento', status: 'GERANDO' });
    expect(prisma.client.resumoIA.create).not.toHaveBeenCalled();
  });

  it('retorna o resumo vigente sem gerar de novo quando hashContexto é idêntico (cache)', async () => {
    const contextoIgual = { promptContext: { campos: { Título: 'Ação X' } }, fontes: [] };
    const hashContexto = hashContent(contextoIgual.promptContext);
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // checagem de GERANDO em andamento
      .mockResolvedValueOnce({ id: 'vigente-1', status: 'PRONTO', hashContexto, versaoResumo: 1 });
    const { service, prisma } = buildDeps({ resumoIA: { findFirst } });

    const result = await service.requestSummary({ ...baseParams, contextResult: contextoIgual });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ id: 'vigente-1', status: 'PRONTO' });
    expect(prisma.client.resumoIA.create).not.toHaveBeenCalled();
  });

  it('cria uma nova versão quando hashContexto mudou desde o vigente', async () => {
    const findFirst = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'vigente-1',
      status: 'PRONTO',
      hashContexto: 'hash-antigo',
      versaoResumo: 3,
    });
    const { service, prisma } = buildDeps({ resumoIA: { findFirst } });

    const result = await service.requestSummary(baseParams);

    expect(result.ok).toBe(true);
    expect(prisma.client.resumoIA.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versaoResumo: 4, status: 'GERANDO' }),
      }),
    );
  });

  it('com force:true, ignora o cache mesmo com hashContexto idêntico (regeneração explícita)', async () => {
    const contextoIgual = { promptContext: { campos: { Título: 'Ação X' } }, fontes: [] };
    const hashContexto = hashContent(contextoIgual.promptContext);
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'vigente-1', status: 'PRONTO', hashContexto, versaoResumo: 1 });
    const { service, prisma } = buildDeps({ resumoIA: { findFirst } });

    const result = await service.requestSummary({
      ...baseParams,
      contextResult: contextoIgual,
      force: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe('novo-resumo');
    expect(prisma.client.resumoIA.create).toHaveBeenCalled();
  });

  it('gera em segundo plano: persiste PRONTO + fontes e publica eventos token/done no stream bus', async () => {
    const provider = fakeProvider('Conteúdo gerado com sucesso.');
    const { service, prisma, streamBus, timelineRecorder } = buildDeps({ provider });

    const result = await service.requestSummary({
      ...baseParams,
      contextResult: {
        promptContext: { campos: { Título: 'Ação X' } },
        fontes: [
          {
            sourceType: 'METADADO_PROCESSO',
            processoId: 'processo-1',
            trechoOuReferencia: 'ref',
            hashFonte: 'h1',
          },
        ],
      },
    });
    expect(result.ok).toBe(true);

    await flushAsync();

    expect(prisma.client.resumoIA.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PRONTO',
          conteudo: 'Conteúdo gerado com sucesso.',
        }),
      }),
    );
    expect(prisma.client.fonteIA.createMany).toHaveBeenCalled();
    expect(streamBus.publish).toHaveBeenCalledWith(
      'novo-resumo',
      expect.objectContaining({ type: 'token' }),
    );
    expect(streamBus.publish).toHaveBeenCalledWith(
      'novo-resumo',
      expect.objectContaining({ type: 'done' }),
    );
    expect(timelineRecorder.record).not.toHaveBeenCalled(); // findFirst de releitura devolve null no mock — sem processoId conhecido
  });

  it('em caso de falha do provedor, marca status FALHA e publica evento error', async () => {
    const providerComFalha = {
      name: 'fake',
      generate: jest.fn(),
      // eslint-disable-next-line require-yield
      async *generateStream(): AsyncGenerator<never, never> {
        throw new Error('provedor indisponível');
      },
      healthCheck: jest.fn(),
    };
    const { service, prisma, streamBus } = buildDeps({ provider: providerComFalha as never });

    await service.requestSummary(baseParams);
    // `withRetry` tenta 1 vez extra com backoff real (setTimeout) antes de desistir —
    // flush de microtask não avança timers reais, por isso a espera aqui é maior.
    await new Promise((resolve) => setTimeout(resolve, 800));
    await flushAsync();

    expect(prisma.client.resumoIA.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FALHA' }) }),
    );
    expect(streamBus.publish).toHaveBeenCalledWith(
      'novo-resumo',
      expect.objectContaining({ type: 'error' }),
    );
  }, 10_000);
});
