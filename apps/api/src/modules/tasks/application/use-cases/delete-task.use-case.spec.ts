import { DeleteTaskUseCase } from './delete-task.use-case';

describe('DeleteTaskUseCase', () => {
  it('retorna NOT_FOUND fora do escritório', async () => {
    const prisma = {
      client: { tarefa: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() } },
    };
    const result = await new DeleteTaskUseCase(prisma as never).execute('escritorio-1', 'tarefa-x');
    expect(result.ok).toBe(false);
  });

  it('faz soft delete (excluidoEm)', async () => {
    const prisma = {
      client: {
        tarefa: { findFirst: jest.fn().mockResolvedValue({ id: 'tarefa-1' }), update: jest.fn() },
      },
    };
    const result = await new DeleteTaskUseCase(prisma as never).execute('escritorio-1', 'tarefa-1');
    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});
