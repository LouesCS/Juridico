import {
  CancelSummaryUseCase,
  GetSummaryUseCase,
  ListSummariesUseCase,
  SummaryFeedbackUseCase,
} from './ai-summary-lifecycle.use-cases';

const resumoBase = {
  id: 'resumo-1',
  escopoTipo: 'PROCESSO',
  processoId: 'processo-1',
  documentoId: null,
  clienteId: null,
  tipoResumo: 'GERAL',
  versaoResumo: 1,
  status: 'PRONTO',
  conteudo: 'Texto gerado.',
  estruturaJson: null,
  modelo: 'mock-v1',
  promptVersion: 'resumo-processo-geral@v1',
  tokensEntrada: 100,
  tokensSaida: 50,
  custoEstimadoCentavos: 12,
  latenciaMs: 30,
  erro: null,
  feedback: null,
  comentarioFeedback: null,
  vigente: true,
  geradoEm: new Date(),
  criadoEm: new Date(),
  solicitadoPorId: 'membro-1',
};

function buildPrisma(resumo: unknown, processoAcessivel: unknown = { id: 'processo-1' }) {
  return {
    client: {
      resumoIA: {
        findFirst: jest.fn().mockResolvedValue(resumo),
        findMany: jest.fn().mockResolvedValue(resumo ? [resumo] : []),
        update: jest.fn().mockResolvedValue({}),
      },
      processo: { findFirst: jest.fn().mockResolvedValue(processoAcessivel) },
      membro: { findFirst: jest.fn().mockResolvedValue(null) },
    },
  };
}

describe('GetSummaryUseCase — visibilidade de custo/tokens (docs/api/14-ai.md §14.2)', () => {
  it('omite tokensEntrada/tokensSaida/custoEstimadoCentavos para quem não tem ai:usage:read', async () => {
    const prisma = buildPrisma(resumoBase);
    const useCase = new GetSummaryUseCase(prisma as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'membro-1',
      permissions: ['case:read:all'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty('tokensEntrada');
      expect(result.value).not.toHaveProperty('custoEstimadoCentavos');
      expect(result.value.conteudo).toBe('Texto gerado.');
    }
  });

  it('inclui tokens/custo para quem tem ai:usage:read', async () => {
    const prisma = buildPrisma(resumoBase);
    const useCase = new GetSummaryUseCase(prisma as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'membro-1',
      permissions: ['case:read:all', 'ai:usage:read'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        tokensEntrada: 100,
        tokensSaida: 50,
        custoEstimadoCentavos: 12,
      });
    }
  });

  it('retorna NOT_FOUND quando o resumo não é acessível ao usuário (processo fora de escopo)', async () => {
    const prisma = buildPrisma(resumoBase, null);
    const useCase = new GetSummaryUseCase(prisma as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'membro-2',
      permissions: ['case:read:assigned'],
    } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('ListSummariesUseCase', () => {
  it('nunca vaza histórico de um escopo inacessível — 404 se o primeiro resumo encontrado já não é acessível', async () => {
    const prisma = buildPrisma(resumoBase, null);
    const useCase = new ListSummariesUseCase(prisma as never);

    const result = await useCase.execute('escritorio-1', 'PROCESSO', 'processo-1', {
      membroId: 'membro-2',
      permissions: ['case:read:assigned'],
    } as never);

    expect(result.ok).toBe(false);
  });
});

describe('CancelSummaryUseCase', () => {
  it('bloqueia com FORBIDDEN quando quem cancela não é o autor da solicitação', async () => {
    const prisma = buildPrisma({ ...resumoBase, status: 'GERANDO' });
    const streamBus = { publish: jest.fn() };
    const useCase = new CancelSummaryUseCase(prisma as never, streamBus as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'outro-membro',
      permissions: [],
    } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
    expect(streamBus.publish).not.toHaveBeenCalled();
  });

  it('cancela quando GERANDO e é o próprio autor — marca FALHA e publica error no stream', async () => {
    const prisma = buildPrisma({ ...resumoBase, status: 'GERANDO' });
    const streamBus = { publish: jest.fn() };
    const useCase = new CancelSummaryUseCase(prisma as never, streamBus as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'membro-1',
      permissions: [],
    } as never);

    expect(result.ok).toBe(true);
    expect(prisma.client.resumoIA.update).toHaveBeenCalledWith({
      where: { id: 'resumo-1' },
      data: { status: 'FALHA', erro: 'Cancelado pelo usuário' },
    });
    expect(streamBus.publish).toHaveBeenCalledWith(
      'resumo-1',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('ignora silenciosamente (best-effort) quando o resumo já está PRONTO/FALHA', async () => {
    const prisma = buildPrisma({ ...resumoBase, status: 'PRONTO' });
    const streamBus = { publish: jest.fn() };
    const useCase = new CancelSummaryUseCase(prisma as never, streamBus as never);

    const result = await useCase.execute('escritorio-1', 'resumo-1', {
      membroId: 'membro-1',
      permissions: [],
    } as never);

    expect(result.ok).toBe(true);
    expect(prisma.client.resumoIA.update).not.toHaveBeenCalled();
  });
});

describe('SummaryFeedbackUseCase', () => {
  it('grava feedback quando o resumo é acessível', async () => {
    const prisma = buildPrisma(resumoBase);
    const useCase = new SummaryFeedbackUseCase(prisma as never);

    const result = await useCase.execute(
      'escritorio-1',
      'resumo-1',
      { feedback: 'NEGATIVO', comentarioFeedback: 'Faltou o prazo recursal' },
      { membroId: 'membro-1', permissions: ['case:read:all'] } as never,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.resumoIA.update).toHaveBeenCalledWith({
      where: { id: 'resumo-1' },
      data: { feedback: 'NEGATIVO', comentarioFeedback: 'Faltou o prazo recursal' },
    });
  });
});
