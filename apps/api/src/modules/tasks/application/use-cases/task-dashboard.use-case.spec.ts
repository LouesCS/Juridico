import { TaskDashboardUseCase } from './task-dashboard.use-case';

describe('TaskDashboardUseCase', () => {
  it('agrega minhas tarefas/equipe/atrasadas/hoje/próximas/concluídas/produtividade', async () => {
    const prisma = {
      client: {
        membro: { findFirst: jest.fn().mockResolvedValue({ equipeId: 'equipe-1' }) },
        tarefa: {
          count: jest
            .fn()
            .mockResolvedValueOnce(3) // minhasPendentes
            .mockResolvedValueOnce(5) // equipePendentes
            .mockResolvedValueOnce(1) // atrasadas
            .mockResolvedValueOnce(2) // hoje
            .mockResolvedValueOnce(4) // proximas
            .mockResolvedValueOnce(6) // concluidasNoMes
            .mockResolvedValueOnce(10), // criadasNoMes
        },
      },
    };
    const user = { membroId: 'membro-1', permissions: [] } as never;

    const result = await new TaskDashboardUseCase(prisma as never).execute('escritorio-1', user);

    expect(result).toEqual({
      minhasTarefasPendentes: 3,
      equipeTarefasPendentes: 5,
      atrasadas: 1,
      hoje: 2,
      proximas: 4,
      concluidasNoMes: 6,
      produtividade: { concluidas: 6, criadas: 10, percentual: 60 },
    });
  });

  it('equipeTarefasPendentes é 0 quando o membro não tem equipe', async () => {
    const prisma = {
      client: {
        membro: { findFirst: jest.fn().mockResolvedValue({ equipeId: null }) },
        tarefa: { count: jest.fn().mockResolvedValue(0) },
      },
    };
    const user = { membroId: 'membro-1', permissions: [] } as never;

    const result = await new TaskDashboardUseCase(prisma as never).execute('escritorio-1', user);

    expect(result.equipeTarefasPendentes).toBe(0);
  });
});
