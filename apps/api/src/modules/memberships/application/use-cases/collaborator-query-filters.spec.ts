import { buildCollaboratorOrderBy, buildCollaboratorWhere } from './collaborator-query-filters';

function buildPrisma() {
  return { client: { $queryRaw: jest.fn() } };
}

describe('buildCollaboratorWhere', () => {
  it('combina nome + cargoId (dois filtros simultâneos) no mesmo where', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      nome: 'Ana',
      cargoId: 'cargo-real-123',
    });

    expect(where).toEqual(
      expect.objectContaining({
        escritorioId: 'escritorio-1',
        nome: { contains: 'Ana', mode: 'insensitive' },
        cargoId: 'cargo-real-123',
      }),
    );
    expect(prisma.client.$queryRaw).not.toHaveBeenCalled();
  });

  it('combina grupoId + acesso (dois filtros simultâneos)', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      grupoId: 'grupo-real-456',
      acesso: 'com_acesso',
    });

    expect(where).toEqual(
      expect.objectContaining({
        escritorioId: 'escritorio-1',
        gruposColaboradores: { some: { grupoId: 'grupo-real-456' } },
        usuarioId: { not: null },
      }),
    );
  });

  it('nunca usa nome de cargo/grupo hardcoded — grupoId/cargoId são sempre os ids recebidos na query', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      grupoId: 'id-arbitrario-do-chamador',
      cargoId: 'outro-id-arbitrario',
    });

    expect((where.gruposColaboradores as { some: { grupoId: string } }).some.grupoId).toBe(
      'id-arbitrario-do-chamador',
    );
    expect(where.cargoId).toBe('outro-id-arbitrario');
  });

  it('traduz situacao=bloqueado para as condições relacionais corretas', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      situacao: 'bloqueado',
    });

    expect(where).toEqual(
      expect.objectContaining({
        status: { notIn: ['INATIVO', 'SUSPENSO'] },
        usuarioId: { not: null },
        usuario: { status: 'BLOQUEADO' },
      }),
    );
  });

  it('traduz situacao=convite_pendente para as condições relacionais corretas', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      situacao: 'convite_pendente',
    });

    expect(where).toEqual(
      expect.objectContaining({
        status: { notIn: ['INATIVO', 'SUSPENSO'] },
        usuarioId: null,
        convitesRecebidos: { some: { status: 'PENDENTE' } },
      }),
    );
  });

  it('monta o OR de `q` incluindo cargo.nome e grupo.nome (relacional, nunca client-side)', async () => {
    const prisma = buildPrisma();

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', { q: 'ana' });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cargoCatalogo: { nome: { contains: 'ana', mode: 'insensitive' } } },
        {
          gruposColaboradores: {
            some: { grupo: { nome: { contains: 'ana', mode: 'insensitive' } } },
          },
        },
      ]),
    );
  });

  it('usa $queryRaw parametrizado apenas quando dia/mês/ano de nascimento são informados', async () => {
    const prisma = buildPrisma();
    (prisma.client.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'membro-1' }]);

    const where = await buildCollaboratorWhere(prisma as never, 'escritorio-1', {
      nascimentoDia: 15,
      nascimentoMes: 6,
    });

    expect(prisma.client.$queryRaw).toHaveBeenCalledTimes(1);
    expect(where.id).toEqual({ in: ['membro-1'] });
  });
});

describe('buildCollaboratorOrderBy', () => {
  it('mapeia cada valor de sort para o orderBy correto, incluindo ordenação pela relação cargoCatalogo', () => {
    expect(buildCollaboratorOrderBy('nome_asc')).toEqual({ nome: 'asc' });
    expect(buildCollaboratorOrderBy('nome_desc')).toEqual({ nome: 'desc' });
    expect(buildCollaboratorOrderBy('cargo_asc')).toEqual({ cargoCatalogo: { nome: 'asc' } });
    expect(buildCollaboratorOrderBy('cargo_desc')).toEqual({ cargoCatalogo: { nome: 'desc' } });
    expect(buildCollaboratorOrderBy('nascimento_asc')).toEqual({ dataNascimento: 'asc' });
    expect(buildCollaboratorOrderBy('cadastro_desc')).toEqual({ criadoEm: 'desc' });
    expect(buildCollaboratorOrderBy('alteracao_asc')).toEqual({ atualizadoEm: 'asc' });
  });
});
