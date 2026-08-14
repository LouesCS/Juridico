import {
  BulkUpdateRequiredFieldsUseCase,
  ListRequiredFieldsUseCase,
} from './required-fields.use-cases';

function buildPrisma() {
  return {
    client: {
      campoObrigatorio: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    },
  };
}

describe('ListRequiredFieldsUseCase', () => {
  it('filtra por entidade quando informada', async () => {
    const prisma = buildPrisma();
    prisma.client.campoObrigatorio.findMany.mockResolvedValue([]);
    await new ListRequiredFieldsUseCase(prisma as never).execute('escritorio-1', {
      entidade: 'PROCESSO',
    });
    expect(prisma.client.campoObrigatorio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { escritorioId: 'escritorio-1', entidade: 'PROCESSO' } }),
    );
  });
});

describe('BulkUpdateRequiredFieldsUseCase', () => {
  it('faz upsert de cada item dentro de uma transação', async () => {
    const prisma = buildPrisma();
    prisma.client.campoObrigatorio.upsert.mockResolvedValue({});
    prisma.client.campoObrigatorio.findMany.mockResolvedValue([
      { entidade: 'CLIENTE', campo: 'endereco', obrigatorio: true },
    ]);

    const result = await new BulkUpdateRequiredFieldsUseCase(prisma as never).execute(
      'escritorio-1',
      {
        itens: [{ entidade: 'CLIENTE', campo: 'endereco', obrigatorio: true }],
      },
    );

    expect(prisma.client.$transaction).toHaveBeenCalled();
    expect(prisma.client.campoObrigatorio.upsert).toHaveBeenCalledWith({
      where: {
        escritorioId_entidade_campo: {
          escritorioId: 'escritorio-1',
          entidade: 'CLIENTE',
          campo: 'endereco',
        },
      },
      create: {
        escritorioId: 'escritorio-1',
        entidade: 'CLIENTE',
        campo: 'endereco',
        obrigatorio: true,
      },
      update: { obrigatorio: true },
    });
    expect(result).toEqual([{ entidade: 'CLIENTE', campo: 'endereco', obrigatorio: true }]);
  });
});
