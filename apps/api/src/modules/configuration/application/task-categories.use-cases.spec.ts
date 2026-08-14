import {
  CreateTaskCategoryUseCase,
  DeleteTaskCategoryUseCase,
  UpdateTaskCategoryUseCase,
} from './task-categories.use-cases';

function buildPrisma() {
  return {
    client: {
      categoriaTarefa: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    },
  };
}

describe('CreateTaskCategoryUseCase', () => {
  it('rejeita nome duplicado (DUPLICATE_NAME)', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue({ id: 'existente' });
    const result = await new CreateTaskCategoryUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Prazos Fatais',
      cor: '#FF0000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
  });

  it('cria quando nome é único', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue(null);
    prisma.client.categoriaTarefa.create.mockResolvedValue({ id: 'categoria-1' });
    const result = await new CreateTaskCategoryUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Prazos Fatais',
      cor: '#FF0000',
    });
    expect(result.ok).toBe(true);
  });
});

describe('UpdateTaskCategoryUseCase / DeleteTaskCategoryUseCase', () => {
  it('update retorna NOT_FOUND fora do escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue(null);
    const result = await new UpdateTaskCategoryUseCase(prisma as never).execute(
      'escritorio-1',
      'x',
      {
        ativo: false,
      },
    );
    expect(result.ok).toBe(false);
  });

  it('delete nunca é bloqueado por Modelos de Tarefa vinculados (soft delete simples)', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue({ id: 'categoria-1' });
    const result = await new DeleteTaskCategoryUseCase(prisma as never).execute(
      'escritorio-1',
      'categoria-1',
    );
    expect(result.ok).toBe(true);
    expect(prisma.client.categoriaTarefa.update).toHaveBeenCalledWith({
      where: { id: 'categoria-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});
