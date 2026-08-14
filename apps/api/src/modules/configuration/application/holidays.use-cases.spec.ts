import { CreateHolidayUseCase, UpdateHolidayUseCase } from './holidays.use-cases';

function buildPrisma() {
  return {
    client: {
      feriado: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    },
  };
}

describe('CreateHolidayUseCase', () => {
  it('rejeita mesmo nome na mesma data (DUPLICATE_NAME)', async () => {
    const prisma = buildPrisma();
    prisma.client.feriado.findFirst.mockResolvedValue({ id: 'existente' });

    const result = await new CreateHolidayUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Natal',
      data: '2026-12-25',
      tipo: 'NACIONAL',
      recorrenteAnual: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
  });

  it('cria convertendo a data YYYY-MM-DD para Date UTC', async () => {
    const prisma = buildPrisma();
    prisma.client.feriado.findFirst.mockResolvedValue(null);
    prisma.client.feriado.create.mockResolvedValue({ id: 'feriado-1' });

    await new CreateHolidayUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Natal',
      data: '2026-12-25',
      tipo: 'NACIONAL',
      recorrenteAnual: true,
    });

    expect(prisma.client.feriado.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ data: new Date('2026-12-25T00:00:00.000Z') }),
      select: { id: true },
    });
  });
});

describe('UpdateHolidayUseCase', () => {
  it('retorna NOT_FOUND fora do escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.feriado.findFirst.mockResolvedValue(null);

    const result = await new UpdateHolidayUseCase(prisma as never).execute('escritorio-1', 'x', {
      ativo: false,
    });

    expect(result.ok).toBe(false);
  });

  it('converte data quando informada, mantém undefined quando não', async () => {
    const prisma = buildPrisma();
    prisma.client.feriado.findFirst.mockResolvedValue({ id: 'feriado-1' });

    await new UpdateHolidayUseCase(prisma as never).execute('escritorio-1', 'feriado-1', {
      data: '2027-01-01',
    });

    expect(prisma.client.feriado.update).toHaveBeenCalledWith({
      where: { id: 'feriado-1' },
      data: { data: new Date('2027-01-01T00:00:00.000Z') },
    });
  });
});
