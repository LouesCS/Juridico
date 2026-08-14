import { DashboardInsightsUseCase } from './dashboard-insights.use-case';

function buildPrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const defaults = {
    membro: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    prazo: { count: jest.fn().mockResolvedValue(0) },
    processo: { findFirst: jest.fn().mockResolvedValue(null) },
    cliente: { count: jest.fn().mockResolvedValue(0) },
    documento: { count: jest.fn().mockResolvedValue(0) },
  };
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(defaults[model as keyof typeof defaults], methods);
  }
  return { client: defaults };
}

describe('DashboardInsightsUseCase', () => {
  it('sem nenhuma permissão de leitura, devolve lista vazia (nunca inventa insight)', async () => {
    const prisma = buildPrisma();
    const useCase = new DashboardInsightsUseCase(prisma as never);
    const result = await useCase.execute('escritorio-1', {
      membroId: 'm1',
      permissions: [],
    } as never);
    expect(result.insights).toEqual([]);
  });

  it('inclui insight de prazos críticos quando há prazos vencendo em 3 dias', async () => {
    const prisma = buildPrisma({ prazo: { count: jest.fn().mockResolvedValue(5) } });
    const useCase = new DashboardInsightsUseCase(prisma as never);
    const result = await useCase.execute('escritorio-1', {
      membroId: 'm1',
      permissions: ['case:read:all'],
    } as never);
    expect(result.insights.some((i) => i.includes('5 prazos críticos'))).toBe(true);
  });

  it('inclui insight de processo parado quando existe um processo sem movimentação recente', async () => {
    const dataAntiga = new Date('2026-01-01');
    const prisma = buildPrisma({
      processo: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ titulo: 'Ação Y', ultimaAtualizacaoEm: dataAntiga }),
      },
    });
    const useCase = new DashboardInsightsUseCase(prisma as never);
    const result = await useCase.execute('escritorio-1', {
      membroId: 'm1',
      permissions: ['case:read:all'],
    } as never);
    expect(
      result.insights.some((i) => i.includes('Ação Y') && i.includes('sem movimentação')),
    ).toBe(true);
  });

  it('não conta clientes/documentos sem a permissão correspondente', async () => {
    const prisma = buildPrisma({
      cliente: { count: jest.fn().mockResolvedValue(3) },
      documento: { count: jest.fn().mockResolvedValue(2) },
    });
    const useCase = new DashboardInsightsUseCase(prisma as never);
    const result = await useCase.execute('escritorio-1', {
      membroId: 'm1',
      permissions: [],
    } as never);
    expect(result.insights).toEqual([]);
    expect(prisma.client.cliente.count).not.toHaveBeenCalled();
    expect(prisma.client.documento.count).not.toHaveBeenCalled();
  });

  it('inclui insight de clientes desatualizados com client:read', async () => {
    const prisma = buildPrisma({ cliente: { count: jest.fn().mockResolvedValue(4) } });
    const useCase = new DashboardInsightsUseCase(prisma as never);
    const result = await useCase.execute('escritorio-1', {
      membroId: 'm1',
      permissions: ['client:read'],
    } as never);
    expect(result.insights.some((i) => i.includes('4 clientes') && i.includes('90 dias'))).toBe(
      true,
    );
  });
});
