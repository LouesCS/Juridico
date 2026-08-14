import { ListDeadlinesAggregateUseCase } from './list-deadlines-aggregate.use-case';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    usuarioId: 'usuario-1',
    membroId: 'membro-1',
    escritorioId: 'escritorio-1',
    sessionId: 'sessao-1',
    roles: [],
    permissions: ['case:read:all'],
    ...overrides,
  };
}

describe('ListDeadlinesAggregateUseCase', () => {
  const prisma = {
    client: {
      prazo: { findMany: jest.fn() },
      membro: { findFirst: jest.fn(), findMany: jest.fn() },
      cliente: { findMany: jest.fn() },
    },
  };

  function buildUseCase() {
    return new ListDeadlinesAggregateUseCase(prisma as never);
  }

  const baseQuery = { escopo: 'meus' as const, sort: 'dataVencimento' as const, limit: 50 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.cliente.findMany.mockResolvedValue([{ id: 'cliente-1', nome: 'João da Silva' }]);
    prisma.client.membro.findMany.mockResolvedValue([
      { id: 'membro-1', usuario: { nome: 'Ana', avatarUrl: null } },
    ]);
  });

  it('filtra por responsavelId = membro do ator quando escopo=meus', async () => {
    prisma.client.prazo.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', buildUser(), baseQuery);

    expect(prisma.client.prazo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ responsavelId: 'membro-1' }) }),
    );
  });

  it('escopo=todos não aplica filtro de responsável', async () => {
    prisma.client.prazo.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', buildUser(), { ...baseQuery, escopo: 'todos' });

    const chamada = prisma.client.prazo.findMany.mock.calls[0][0];
    expect(chamada.where.responsavelId).toBeUndefined();
  });

  it('monta itens com cliente e responsável resolvidos', async () => {
    prisma.client.prazo.findMany.mockResolvedValue([
      {
        id: 'prazo-1',
        titulo: 'Contestação',
        tipo: 'FATAL',
        origem: 'MANUAL',
        dataVencimento: new Date('2026-08-10T00:00:00.000Z'),
        prioridade: 'ALTA',
        status: 'PENDENTE',
        criadoEm: new Date('2026-08-01T00:00:00.000Z'),
        responsavelId: 'membro-1',
        processo: {
          id: 'processo-1',
          titulo: 'Ação de cobrança',
          numeroCnj: null,
          clienteId: 'cliente-1',
        },
      },
    ]);

    const result = await buildUseCase().execute('escritorio-1', buildUser(), baseQuery);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].cliente).toEqual({ id: 'cliente-1', nome: 'João da Silva' });
    expect(result.items[0].responsavel).toEqual({ id: 'membro-1', nome: 'Ana', avatarUrl: null });
    expect(result.nextCursor).toBeNull();
  });

  it('indica nextCursor quando há mais resultados do que o limite pedido', async () => {
    const prazos = Array.from({ length: 3 }, (_, i) => ({
      id: `prazo-${i}`,
      titulo: `Prazo ${i}`,
      tipo: 'TAREFA',
      origem: 'MANUAL',
      dataVencimento: new Date(),
      prioridade: 'MEDIA',
      status: 'PENDENTE',
      criadoEm: new Date(),
      responsavelId: 'membro-1',
      processo: { id: 'processo-1', titulo: 'Processo', numeroCnj: null, clienteId: 'cliente-1' },
    }));
    prisma.client.prazo.findMany.mockResolvedValue(prazos);

    const result = await buildUseCase().execute('escritorio-1', buildUser(), {
      ...baseQuery,
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('prazo-1');
  });
});
