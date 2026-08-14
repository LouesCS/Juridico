import { ListClientsUseCase } from './list-clients.use-case';

describe('ListClientsUseCase', () => {
  const prisma = {
    client: {
      cliente: { findMany: jest.fn() },
      membro: { findMany: jest.fn() },
      processo: { count: jest.fn() },
    },
  };

  function buildUseCase() {
    return new ListClientsUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  const baseQuery = { sort: '-criadoEm' as const, limit: 20 };

  it('filtra por texto livre em nome/razão social/documento', async () => {
    prisma.client.cliente.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', { ...baseQuery, q: 'Silva' });

    expect(prisma.client.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'escritorio-1',
          OR: expect.arrayContaining([{ nome: { contains: 'Silva', mode: 'insensitive' } }]),
        }),
      }),
    );
  });

  it('aplica filtro de tipo sem reintroduzir Status', async () => {
    prisma.client.cliente.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', {
      ...baseQuery,
      tipo: 'PESSOA_JURIDICA',
    });

    expect(prisma.client.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tipo: 'PESSOA_JURIDICA' }),
      }),
    );
    expect(prisma.client.cliente.findMany.mock.calls[0][0].where).not.toHaveProperty('status');
  });

  it('indica nextCursor quando há mais resultados do que o limite pedido', async () => {
    const registros = Array.from({ length: 3 }, (_, i) => ({
      id: `cliente-${i}`,
      nome: `Cliente ${i}`,
      tipo: 'PESSOA_FISICA',
      cpf: null,
      cnpj: null,
      emails: [],
      telefones: [],
      status: 'ATIVO',
      responsavelId: null,
      atualizadoEm: new Date(),
    }));
    prisma.client.cliente.findMany.mockResolvedValue(registros); // limit+1 = 3, limit = 2
    prisma.client.processo.count.mockResolvedValue(0);

    const result = await buildUseCase().execute('escritorio-1', { ...baseQuery, limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('cliente-1');
  });

  it('retorna nextCursor nulo quando os resultados cabem no limite', async () => {
    prisma.client.cliente.findMany.mockResolvedValue([
      {
        id: 'cliente-0',
        nome: 'Cliente 0',
        tipo: 'PESSOA_FISICA',
        cpf: null,
        cnpj: null,
        emails: [],
        telefones: [],
        status: 'ATIVO',
        responsavelId: null,
        atualizadoEm: new Date(),
      },
    ]);
    prisma.client.processo.count.mockResolvedValue(0);

    const result = await buildUseCase().execute('escritorio-1', { ...baseQuery, limit: 20 });

    expect(result.nextCursor).toBeNull();
  });

  it('retorna o documento (CPF/CNPJ) por completo para quem tem client:read — sem exigir permissão extra (Sprint "Remover mascaramento de dados do cliente em Processos")', async () => {
    prisma.client.cliente.findMany.mockResolvedValue([
      {
        id: 'cliente-0',
        nome: 'Cliente 0',
        tipo: 'PESSOA_FISICA',
        cpf: '52998224725',
        cnpj: null,
        emails: [],
        telefones: [],
        status: 'ATIVO',
        responsavelId: null,
        atualizadoEm: new Date(),
      },
    ]);
    prisma.client.processo.count.mockResolvedValue(0);

    const result = await buildUseCase().execute('escritorio-1', baseQuery);
    expect(result.items[0].documento).toBe('52998224725');
  });
});
