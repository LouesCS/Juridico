import { ListTasksUseCase } from './list-tasks.use-case';

function buildPrisma() {
  return {
    client: {
      membro: {
        findFirst: jest.fn().mockResolvedValue({ equipeId: null }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      tarefa: { findMany: jest.fn().mockResolvedValue([]) },
      categoriaTarefa: { findMany: jest.fn().mockResolvedValue([]) },
      conjuntoValorItem: { findMany: jest.fn().mockResolvedValue([]) },
      tarefaFavorito: { findMany: jest.fn().mockResolvedValue([]) },
      cliente: { findMany: jest.fn().mockResolvedValue([]) },
      processo: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

const baseQuery = { sort: 'dataVencimento' as const, limit: 50 };

describe('ListTasksUseCase', () => {
  it('retorna lista vazia sem nenhuma permissão de leitura de tarefa', async () => {
    const prisma = buildPrisma();
    const user = { membroId: 'm1', permissions: [] } as never;

    const result = await new ListTasksUseCase(prisma as never).execute(
      'escritorio-1',
      user,
      baseQuery as never,
    );

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(prisma.client.tarefa.findMany).not.toHaveBeenCalled();
  });

  it('aplica o filtro de escopo "meus" quando solicitado', async () => {
    const prisma = buildPrisma();
    const user = { membroId: 'm1', permissions: ['task:read:all'] } as never;

    await new ListTasksUseCase(prisma as never).execute('escritorio-1', user, {
      ...baseQuery,
      escopo: 'meus',
    } as never);

    const where = prisma.client.tarefa.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { responsavelPrincipalId: 'm1' },
      { responsaveisAuxiliares: { some: { membroId: 'm1' } } },
    ]);
  });

  it('filtra por vínculo de cliente/processo via TarefaVinculo', async () => {
    const prisma = buildPrisma();
    const user = { membroId: 'm1', permissions: ['task:read:all'] } as never;

    await new ListTasksUseCase(prisma as never).execute('escritorio-1', user, {
      ...baseQuery,
      clienteId: 'cliente-1',
    } as never);

    const where = prisma.client.tarefa.findMany.mock.calls[0][0].where;
    expect(where.vinculos).toEqual({ some: { tipoRecurso: 'CLIENTE', recursoId: 'cliente-1' } });
  });

  it('filtra pela Pasta Jurídica usando o vínculo real do Task Engine', async () => {
    const prisma = buildPrisma();
    const user = { membroId: 'm1', permissions: ['task:read:all'] } as never;

    await new ListTasksUseCase(prisma as never).execute('escritorio-1', user, {
      ...baseQuery,
      pastaJuridicaId: 'pasta-1',
    } as never);

    const where = prisma.client.tarefa.findMany.mock.calls[0][0].where;
    expect(where.vinculos).toEqual({
      some: { tipoRecurso: 'PASTA_JURIDICA', recursoId: 'pasta-1' },
    });
  });
});
