import { CreateCargoUseCase, DeleteCargoUseCase, UpdateCargoUseCase } from './cargos.use-cases';

function buildPrisma() {
  return {
    client: {
      cargo: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    },
  };
}

describe('CreateCargoUseCase', () => {
  it('rejeita nome duplicado no mesmo escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue({ id: 'cargo-existente' });

    const result = await new CreateCargoUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Advogado',
      ordem: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
    expect(prisma.client.cargo.create).not.toHaveBeenCalled();
  });

  it('cria o cargo com escritorioId + ordem quando o nome está livre', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue(null);
    prisma.client.cargo.create.mockResolvedValue({ id: 'cargo-novo' });

    const result = await new CreateCargoUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Advogado',
      ordem: 2,
    });

    expect(result.ok).toBe(true);
    expect(prisma.client.cargo.create).toHaveBeenCalledWith({
      data: { escritorioId: 'escritorio-1', nome: 'Advogado', ordem: 2 },
      select: { id: true },
    });
  });

  it('isola por escritório: a verificação de duplicidade é escopada ao escritorioId do ator', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue(null);
    prisma.client.cargo.create.mockResolvedValue({ id: 'cargo-novo' });

    await new CreateCargoUseCase(prisma as never).execute('escritorio-2', {
      nome: 'Advogado',
      ordem: 0,
    });

    expect(prisma.client.cargo.findFirst).toHaveBeenCalledWith({
      where: { escritorioId: 'escritorio-2', nome: 'Advogado' },
      select: { id: true },
    });
  });
});

describe('UpdateCargoUseCase', () => {
  it('retorna NOT_FOUND quando o cargo não pertence ao escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue(null);

    const result = await new UpdateCargoUseCase(prisma as never).execute(
      'escritorio-1',
      'cargo-x',
      {
        nome: 'Novo Nome',
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.cargo.update).not.toHaveBeenCalled();
  });

  it('atualiza o cargo quando ele pertence ao escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue({ id: 'cargo-1' });

    const result = await new UpdateCargoUseCase(prisma as never).execute(
      'escritorio-1',
      'cargo-1',
      {
        ordem: 5,
      },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.cargo.update).toHaveBeenCalledWith({
      where: { id: 'cargo-1' },
      data: { ordem: 5 },
    });
  });
});

describe('DeleteCargoUseCase', () => {
  it('retorna NOT_FOUND quando o cargo não pertence ao escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue(null);

    const result = await new DeleteCargoUseCase(prisma as never).execute('escritorio-1', 'cargo-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.cargo.update).not.toHaveBeenCalled();
  });

  it('faz soft-delete preenchendo excluidoEm (nunca exclusão física)', async () => {
    const prisma = buildPrisma();
    prisma.client.cargo.findFirst.mockResolvedValue({ id: 'cargo-1' });

    const result = await new DeleteCargoUseCase(prisma as never).execute('escritorio-1', 'cargo-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.cargo.update).toHaveBeenCalledWith({
      where: { id: 'cargo-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});
