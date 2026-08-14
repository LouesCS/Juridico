import {
  AddValueSetItemUseCase,
  CreateValueSetUseCase,
  DeleteValueSetUseCase,
  GetValueSetUseCase,
  RemoveValueSetItemUseCase,
  UpdateValueSetItemUseCase,
  UpdateValueSetUseCase,
} from './value-sets.use-cases';

function buildPrisma() {
  return {
    client: {
      conjuntoValores: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      conjuntoValorItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };
}

describe('GetValueSetUseCase', () => {
  it('retorna NOT_FOUND fora do escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(null);
    const result = await new GetValueSetUseCase(prisma as never).execute('escritorio-1', 'x');
    expect(result.ok).toBe(false);
  });
});

describe('CreateValueSetUseCase', () => {
  it('rejeita nome duplicado (DUPLICATE_NAME)', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue({ id: 'existente' });
    const result = await new CreateValueSetUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Tipo de Ação',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
  });
});

describe('UpdateValueSetUseCase / DeleteValueSetUseCase', () => {
  it('update retorna NOT_FOUND quando conjunto não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(null);
    const result = await new UpdateValueSetUseCase(prisma as never).execute('escritorio-1', 'x', {
      ativo: false,
    });
    expect(result.ok).toBe(false);
  });

  it('delete faz soft delete', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue({ id: 'conjunto-1' });
    const result = await new DeleteValueSetUseCase(prisma as never).execute(
      'escritorio-1',
      'conjunto-1',
    );
    expect(result.ok).toBe(true);
    expect(prisma.client.conjuntoValores.update).toHaveBeenCalledWith({
      where: { id: 'conjunto-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});

describe('AddValueSetItemUseCase / UpdateValueSetItemUseCase / RemoveValueSetItemUseCase', () => {
  it('add retorna NOT_FOUND quando o conjunto não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(null);
    const result = await new AddValueSetItemUseCase(prisma as never).execute(
      'escritorio-1',
      'conjunto-x',
      {
        valor: 'Cível',
        ordem: 0,
      },
    );
    expect(result.ok).toBe(false);
    expect(prisma.client.conjuntoValorItem.create).not.toHaveBeenCalled();
  });

  it('add cria item quando o conjunto existe', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue({ id: 'conjunto-1' });
    prisma.client.conjuntoValorItem.create.mockResolvedValue({ id: 'item-1' });
    const result = await new AddValueSetItemUseCase(prisma as never).execute(
      'escritorio-1',
      'conjunto-1',
      {
        valor: 'Cível',
        ordem: 0,
      },
    );
    expect(result.ok).toBe(true);
  });

  it('update/remove escopam o item pelo conjunto.escritorioId (defesa cross-tenant)', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValorItem.findFirst.mockResolvedValue(null);

    const updateResult = await new UpdateValueSetItemUseCase(prisma as never).execute(
      'escritorio-1',
      'conjunto-1',
      'item-x',
      { valor: 'Trabalhista' },
    );
    expect(updateResult.ok).toBe(false);

    const removeResult = await new RemoveValueSetItemUseCase(prisma as never).execute(
      'escritorio-1',
      'conjunto-1',
      'item-x',
    );
    expect(removeResult.ok).toBe(false);
    expect(prisma.client.conjuntoValorItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'item-x',
          conjuntoId: 'conjunto-1',
          conjunto: { escritorioId: 'escritorio-1' },
        },
      }),
    );
  });
});
