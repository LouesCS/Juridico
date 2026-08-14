import { UpdateTaskUseCase } from './update-task.use-case';

function buildPrisma(tarefaExistente: unknown) {
  return {
    client: {
      tarefa: { findFirst: jest.fn().mockResolvedValue(tarefaExistente), update: jest.fn() },
      categoriaTarefa: { findFirst: jest.fn() },
      conjuntoValorItem: { findFirst: jest.fn() },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
      equipe: { findFirst: jest.fn() },
      grupoColaboradores: { findFirst: jest.fn() },
    },
  };
}

describe('UpdateTaskUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe', async () => {
    const prisma = buildPrisma(null);
    const timeline = { record: jest.fn() };
    const result = await new UpdateTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-x',
      'membro-1',
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('registra ALTERACAO_RESPONSAVEL só quando o responsável muda', async () => {
    const prisma = buildPrisma({
      id: 'tarefa-1',
      responsavelPrincipalId: 'membro-antigo',
      statusId: null,
      prioridadeId: null,
    });
    prisma.client.membro.findMany.mockResolvedValue([{ id: 'membro-novo' }]);
    const timeline = { record: jest.fn() };

    await new UpdateTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-ator',
      {
        responsavelPrincipalId: 'membro-novo',
      },
    );

    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALTERACAO_RESPONSAVEL' }),
    );
    expect(timeline.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALTERACAO_STATUS' }),
    );
  });

  it('não registra evento quando o responsável enviado é igual ao atual', async () => {
    const prisma = buildPrisma({
      id: 'tarefa-1',
      responsavelPrincipalId: 'membro-1',
      statusId: null,
      prioridadeId: null,
    });
    prisma.client.membro.findMany.mockResolvedValue([{ id: 'membro-1' }]);
    const timeline = { record: jest.fn() };

    const result = await new UpdateTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-ator',
      {
        responsavelPrincipalId: 'membro-1',
      },
    );

    expect(result.ok).toBe(true);
    expect(timeline.record).not.toHaveBeenCalled();
  });
});
