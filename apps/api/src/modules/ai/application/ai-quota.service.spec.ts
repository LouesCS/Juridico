import { AiQuotaService } from './ai-quota.service';

function buildPrisma(
  plano: string,
  resumosGerados: number,
  configuracoes?: Record<string, unknown>,
) {
  return {
    client: {
      escritorio: { findFirst: jest.fn().mockResolvedValue({ plano, configuracoes }) },
      resumoIA: { count: jest.fn().mockResolvedValue(resumosGerados) },
    },
  };
}

function buildConfig(values: Record<string, unknown>) {
  return { get: jest.fn((key: string) => values[key]) };
}

describe('AiQuotaService', () => {
  const config = buildConfig({
    AI_MONTHLY_QUOTA_TRIAL: 20,
    AI_MONTHLY_QUOTA_ESSENCIAL: 100,
    AI_MONTHLY_QUOTA_PROFISSIONAL: 500,
  });

  it('permite quando abaixo da cota do plano', async () => {
    const prisma = buildPrisma('TRIAL', 5);
    const service = new AiQuotaService(prisma as never, config as never);
    const status = await service.checkQuota('escritorio-1');
    expect(status).toEqual({ permitido: true, resumosGerados: 5, cotaMensal: 20 });
  });

  it('bloqueia quando atinge a cota do plano', async () => {
    const prisma = buildPrisma('TRIAL', 20);
    const service = new AiQuotaService(prisma as never, config as never);
    const status = await service.checkQuota('escritorio-1');
    expect(status.permitido).toBe(false);
  });

  it('ENTERPRISE é ilimitado — sempre permite, mesmo com uso alto', async () => {
    const prisma = buildPrisma('ENTERPRISE', 10_000);
    const service = new AiQuotaService(prisma as never, config as never);
    const status = await service.checkQuota('escritorio-1');
    expect(status).toEqual({ permitido: true, resumosGerados: 10_000, cotaMensal: null });
  });

  it('Configuration Engine — cotaMensalPersonalizada sobrepõe a cota do plano', async () => {
    const prisma = buildPrisma('TRIAL', 5, { ia: { cotaMensalPersonalizada: 3 } });
    const service = new AiQuotaService(prisma as never, config as never);
    const status = await service.checkQuota('escritorio-1');
    expect(status).toEqual({ permitido: false, resumosGerados: 5, cotaMensal: 3 });
  });

  it('cotaMensalPersonalizada null (não configurado) cai de volta para a cota do plano', async () => {
    const prisma = buildPrisma('TRIAL', 5, { ia: { cotaMensalPersonalizada: null } });
    const service = new AiQuotaService(prisma as never, config as never);
    const status = await service.checkQuota('escritorio-1');
    expect(status.cotaMensal).toBe(20);
  });

  it('só conta resumos com status PRONTO deste mês (contagem delegada à query)', async () => {
    const prisma = buildPrisma('ESSENCIAL', 3);
    const service = new AiQuotaService(prisma as never, config as never);
    await service.checkQuota('escritorio-1');
    const where = prisma.client.resumoIA.count.mock.calls[0][0].where;
    expect(where.status).toBe('PRONTO');
    expect(where.escritorioId).toBe('escritorio-1');
    expect(where.geradoEm.gte).toBeInstanceOf(Date);
  });
});
