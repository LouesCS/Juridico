import {
  CreateExtraFieldUseCase,
  DeleteExtraFieldUseCase,
  ListExtraFieldsUseCase,
  UpdateExtraFieldUseCase,
} from './extra-fields.use-cases';

function buildPrisma() {
  return {
    client: {
      campoExtra: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    },
  };
}

describe('ListExtraFieldsUseCase', () => {
  it('filtra por entidade quando informada', async () => {
    const prisma = buildPrisma();
    prisma.client.campoExtra.findMany.mockResolvedValue([]);
    await new ListExtraFieldsUseCase(prisma as never).execute('escritorio-1', {
      entidade: 'CLIENTE',
    });
    expect(prisma.client.campoExtra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { escritorioId: 'escritorio-1', entidade: 'CLIENTE' } }),
    );
  });
});

describe('CreateExtraFieldUseCase', () => {
  it('rejeita chave duplicada na mesma entidade (DUPLICATE_NAME)', async () => {
    const prisma = buildPrisma();
    prisma.client.campoExtra.findFirst.mockResolvedValue({ id: 'existente' });

    const result = await new CreateExtraFieldUseCase(prisma as never).execute('escritorio-1', {
      entidade: 'CLIENTE',
      nome: 'Data de Nascimento',
      chave: 'data_nascimento',
      tipo: 'DATA',
      obrigatorio: false,
      opcoes: [],
      ordem: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
    expect(prisma.client.campoExtra.create).not.toHaveBeenCalled();
  });

  it('cria quando chave é única', async () => {
    const prisma = buildPrisma();
    prisma.client.campoExtra.findFirst.mockResolvedValue(null);
    prisma.client.campoExtra.create.mockResolvedValue({ id: 'campo-1' });

    const result = await new CreateExtraFieldUseCase(prisma as never).execute('escritorio-1', {
      entidade: 'CLIENTE',
      nome: 'Data de Nascimento',
      chave: 'data_nascimento',
      tipo: 'DATA',
      obrigatorio: false,
      opcoes: [],
      ordem: 0,
    });

    expect(result.ok).toBe(true);
  });
});

describe('UpdateExtraFieldUseCase / DeleteExtraFieldUseCase', () => {
  it('update retorna NOT_FOUND fora do escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.campoExtra.findFirst.mockResolvedValue(null);

    const result = await new UpdateExtraFieldUseCase(prisma as never).execute(
      'escritorio-1',
      'campo-x',
      {
        ativo: false,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('delete faz soft delete (excluidoEm)', async () => {
    const prisma = buildPrisma();
    prisma.client.campoExtra.findFirst.mockResolvedValue({ id: 'campo-1' });

    const result = await new DeleteExtraFieldUseCase(prisma as never).execute(
      'escritorio-1',
      'campo-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.campoExtra.update).toHaveBeenCalledWith({
      where: { id: 'campo-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});
