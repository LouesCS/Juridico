import { ListRecentTimelineAggregateUseCase } from './list-recent-timeline-aggregate.use-case';

function buildUser(permissions: string[]) {
  return {
    usuarioId: 'usuario-1',
    membroId: 'membro-1',
    escritorioId: 'escritorio-1',
    sessionId: 'sessao-1',
    roles: [],
    permissions,
  };
}

describe('ListRecentTimelineAggregateUseCase', () => {
  const prisma = {
    client: {
      membro: { findFirst: jest.fn(), findMany: jest.fn() },
      processo: { findMany: jest.fn() },
      eventoTimeline: { findMany: jest.fn() },
    },
  };

  function buildUseCase() {
    return new ListRecentTimelineAggregateUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna lista vazia quando o usuário não tem nenhuma permissão case:read:*', async () => {
    const result = await buildUseCase().execute('escritorio-1', buildUser([]), 10);

    expect(result).toEqual([]);
    expect(prisma.client.processo.findMany).not.toHaveBeenCalled();
  });

  it('retorna lista vazia quando o usuário não enxerga nenhum processo', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({ equipeId: null });
    prisma.client.processo.findMany.mockResolvedValue([]);

    const result = await buildUseCase().execute(
      'escritorio-1',
      buildUser(['case:read:assigned']),
      10,
    );

    expect(result).toEqual([]);
    expect(prisma.client.eventoTimeline.findMany).not.toHaveBeenCalled();
  });

  it('agrega eventos dos processos visíveis, resolvendo o autor', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({ equipeId: null });
    prisma.client.processo.findMany.mockResolvedValue([{ id: 'processo-1' }, { id: 'processo-2' }]);
    prisma.client.eventoTimeline.findMany.mockResolvedValue([
      {
        id: 'evento-1',
        tipo: 'CRIACAO_PROCESSO',
        titulo: 'Processo criado',
        dataEvento: new Date('2026-08-01T10:00:00.000Z'),
        autorId: 'membro-1',
        processo: { id: 'processo-1', titulo: 'Ação de cobrança' },
      },
    ]);
    prisma.client.membro.findMany.mockResolvedValue([{ id: 'membro-1', usuario: { nome: 'Ana' } }]);

    const result = await buildUseCase().execute('escritorio-1', buildUser(['case:read:all']), 10);

    expect(result).toEqual([
      {
        id: 'evento-1',
        tipo: 'CRIACAO_PROCESSO',
        titulo: 'Processo criado',
        dataEvento: new Date('2026-08-01T10:00:00.000Z'),
        processo: { id: 'processo-1', titulo: 'Ação de cobrança' },
        autor: { nome: 'Ana' },
      },
    ]);
    expect(prisma.client.eventoTimeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { escritorioId: 'escritorio-1', processoId: { in: ['processo-1', 'processo-2'] } },
      }),
    );
  });
});
