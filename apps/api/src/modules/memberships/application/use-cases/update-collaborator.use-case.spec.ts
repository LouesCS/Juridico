import { UpdateCollaboratorUseCase } from './update-collaborator.use-case';

function buildPrisma() {
  return {
    client: {
      membro: { findFirst: jest.fn(), update: jest.fn() },
      cargo: { findFirst: jest.fn() },
      grupoColaboradores: { findMany: jest.fn() },
      grupoColaboradorMembro: { createMany: jest.fn(), deleteMany: jest.fn() },
    },
  };
}

function buildMembro(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membro-1',
    nome: 'Ana Souza',
    cargoId: 'cargo-antigo',
    gruposColaboradores: [{ grupoId: 'grupo-1' }, { grupoId: 'grupo-2' }],
    ...overrides,
  };
}

describe('UpdateCollaboratorUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o colaborador não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(null);
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-x',
      { nome: 'Novo Nome' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.membro.update).not.toHaveBeenCalled();
  });

  it('atualização parcial preserva campos não enviados (só passa o que veio no DTO)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { nome: 'Ana Souza Silva' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-1' },
      data: expect.objectContaining({ nome: 'Ana Souza Silva' }),
    });
    // Nenhum campo de grupo/cargo foi enviado — não deve mexer em vínculos.
    expect(prisma.client.grupoColaboradorMembro.createMany).not.toHaveBeenCalled();
    expect(prisma.client.grupoColaboradorMembro.deleteMany).not.toHaveBeenCalled();
  });

  it('rejeita cargoId que não pertence ao escritório (cross-tenant)', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    prisma.client.cargo.findFirst.mockResolvedValue(null);
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { cargoId: 'cargo-de-outro-escritorio' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.membro.update).not.toHaveBeenCalled();
  });

  it('grava CARGO_ALTERADO quando cargoId muda', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    prisma.client.cargo.findFirst.mockResolvedValue({ id: 'cargo-novo' });
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { cargoId: 'cargo-novo' },
    );

    expect(result.ok).toBe(true);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_ATUALIZADO' }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CARGO_ALTERADO' }),
    );
  });

  it('não grava CARGO_ALTERADO quando cargoId não muda', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    const timeline = { record: jest.fn() };

    await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { nome: 'Ana' },
    );

    const tipos = timeline.record.mock.calls.map((c) => c[0].tipo);
    expect(tipos).not.toContain('CARGO_ALTERADO');
  });

  it('faz o diff de grupoIds — adiciona os novos e remove os que saíram', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    prisma.client.grupoColaboradores.findMany.mockResolvedValue([
      { id: 'grupo-2' },
      { id: 'grupo-3' },
    ]);
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { grupoIds: ['grupo-2', 'grupo-3'] },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.grupoColaboradorMembro.createMany).toHaveBeenCalledWith({
      data: [{ grupoId: 'grupo-3', membroId: 'membro-1' }],
    });
    expect(prisma.client.grupoColaboradorMembro.deleteMany).toHaveBeenCalledWith({
      where: { membroId: 'membro-1', grupoId: { in: ['grupo-1'] } },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'GRUPO_ALTERADO' }),
    );
  });

  it('rejeita responsavelId igual ao próprio colaborador', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(buildMembro());
    const timeline = { record: jest.fn() };

    const result = await new UpdateCollaboratorUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'ator-1',
      'membro-1',
      { responsavelId: 'membro-1' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });
});
