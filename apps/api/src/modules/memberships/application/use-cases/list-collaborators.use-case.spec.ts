import { ListCollaboratorsUseCase } from './list-collaborators.use-case';

function buildPrisma() {
  return {
    client: {
      membro: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      convite: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn(),
    },
  };
}

function baseQuery(overrides: Record<string, unknown> = {}) {
  return { sort: 'nome_asc' as const, limit: 20, ...overrides };
}

describe('ListCollaboratorsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('query vazia (retrocompatível): lista tudo, sem cursor, ordenação padrão', async () => {
    const prisma = buildPrisma();

    const result = await new ListCollaboratorsUseCase(prisma as never).execute(
      'escritorio-1',
      baseQuery(),
    );

    expect(prisma.client.membro.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ escritorioId: 'escritorio-1' }),
        orderBy: { nome: 'asc' },
      }),
    );
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.total).toBe(0);
  });

  it('projeta temAcesso/situacaoAcesso/cargo/grupos a partir dos dados relacionais', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findMany.mockResolvedValue([
      {
        id: 'membro-1',
        nome: 'Ana',
        nomeSocial: null,
        fotoUrl: null,
        cpf: null,
        email: 'ana@x.com',
        telefone: null,
        celular: null,
        dataNascimento: null,
        status: 'ATIVO',
        criadoEm: new Date('2024-01-01'),
        atualizadoEm: new Date('2024-01-02'),
        usuarioId: 'usuario-1',
        usuario: { status: 'ATIVO' },
        papel: { id: 'papel-1', nome: 'ADVOGADO' },
        cargoCatalogo: { id: 'cargo-1', nome: 'Advogado' },
        gruposColaboradores: [{ grupo: { id: 'grupo-1', nome: 'Trabalhista' } }],
      },
    ]);
    prisma.client.membro.count.mockResolvedValue(1);

    const result = await new ListCollaboratorsUseCase(prisma as never).execute(
      'escritorio-1',
      baseQuery({ cargoId: 'cargo-1' }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'membro-1',
        temAcesso: true,
        situacaoAcesso: 'desbloqueado',
        cargo: { id: 'cargo-1', nome: 'Advogado' },
        grupos: [{ id: 'grupo-1', nome: 'Trabalhista' }],
      }),
    );
    expect(result.total).toBe(1);
  });

  it('pagina por cursor: hasMore=true corta o item extra e devolve nextCursor', async () => {
    const prisma = buildPrisma();
    const membro = (id: string) => ({
      id,
      nome: id,
      nomeSocial: null,
      fotoUrl: null,
      cpf: null,
      email: `${id}@x.com`,
      telefone: null,
      celular: null,
      dataNascimento: null,
      status: 'ATIVO',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      usuarioId: null,
      usuario: null,
      papel: { id: 'papel-1', nome: 'ADVOGADO' },
      cargoCatalogo: null,
      gruposColaboradores: [],
    });
    prisma.client.membro.findMany.mockResolvedValue([membro('m1'), membro('m2')]);
    prisma.client.membro.count.mockResolvedValue(5);

    const result = await new ListCollaboratorsUseCase(prisma as never).execute(
      'escritorio-1',
      baseQuery({ limit: 1 }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('m1');
  });
});
