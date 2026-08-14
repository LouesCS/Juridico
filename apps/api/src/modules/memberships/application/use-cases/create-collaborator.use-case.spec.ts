import { CreateCollaboratorUseCase } from './create-collaborator.use-case';

function buildPrisma() {
  return {
    client: {
      papel: { findFirst: jest.fn().mockResolvedValue({ id: 'papel-1' }) },
      cargo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn(), create: jest.fn() },
      grupoColaboradores: { findMany: jest.fn() },
      grupoColaboradorMembro: { createMany: jest.fn() },
    },
  };
}

function buildDeps() {
  const prisma = buildPrisma();
  const inviteMemberUseCase = { execute: jest.fn().mockResolvedValue({ id: 'convite-1' }) };
  const timeline = { record: jest.fn() };
  return { prisma, inviteMemberUseCase, timeline };
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: 'Ana Souza',
    email: 'ana@escritorio.com',
    papelId: 'papel-1',
    comAcesso: false,
    ...overrides,
  };
}

describe('CreateCollaboratorUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cadastra colaborador com comAcesso=false sem enviar convite', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.membro.create.mockResolvedValue({ id: 'membro-novo' });

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute('escritorio-1', 'ator-1', buildInput());

    expect(result.ok).toBe(true);
    expect(prisma.client.membro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: 'Ana Souza',
          email: 'ana@escritorio.com',
          papelId: 'papel-1',
          escritorioId: 'escritorio-1',
        }),
      }),
    );
    expect(prisma.client.membro.create.mock.calls[0][0].data.usuarioId).toBeUndefined();
    expect(inviteMemberUseCase.execute).not.toHaveBeenCalled();
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COLABORADOR_CADASTRADO', membroId: 'membro-novo' }),
    );
  });

  it('cadastra colaborador com comAcesso=true e envia convite vinculado ao membroId', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.membro.create.mockResolvedValue({ id: 'membro-novo' });

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute('escritorio-1', 'ator-1', buildInput({ comAcesso: true }));

    expect(result.ok).toBe(true);
    expect(inviteMemberUseCase.execute).toHaveBeenCalledWith(
      'escritorio-1',
      'ator-1',
      { email: 'ana@escritorio.com', papelId: 'papel-1' },
      'membro-novo',
    );
  });

  it('rejeita papelId que não pertence ao escritório nem é de sistema', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.papel.findFirst.mockResolvedValue(null);

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute('escritorio-1', 'ator-1', buildInput());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.membro.create).not.toHaveBeenCalled();
  });

  it('rejeita cargoId de outro escritório (cross-tenant)', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.cargo.findFirst.mockResolvedValue(null);

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute(
      'escritorio-1',
      'ator-1',
      buildInput({ cargoId: 'cargo-de-outro-escritorio' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.cargo.findFirst).toHaveBeenCalledWith({
      where: { id: 'cargo-de-outro-escritorio', escritorioId: 'escritorio-1' },
    });
    expect(prisma.client.membro.create).not.toHaveBeenCalled();
  });

  it('rejeita grupoIds quando um ou mais não pertencem ao escritório (cross-tenant)', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.grupoColaboradores.findMany.mockResolvedValue([{ id: 'grupo-1' }]);

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute(
      'escritorio-1',
      'ator-1',
      buildInput({ grupoIds: ['grupo-1', 'grupo-de-outro-escritorio'] }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.membro.create).not.toHaveBeenCalled();
  });

  it('vincula os grupos validados via grupoColaboradorMembro.createMany', async () => {
    const { prisma, inviteMemberUseCase, timeline } = buildDeps();
    prisma.client.grupoColaboradores.findMany.mockResolvedValue([
      { id: 'grupo-1' },
      { id: 'grupo-2' },
    ]);
    prisma.client.membro.create.mockResolvedValue({ id: 'membro-novo' });

    const useCase = new CreateCollaboratorUseCase(
      prisma as never,
      inviteMemberUseCase as never,
      timeline as never,
    );
    const result = await useCase.execute(
      'escritorio-1',
      'ator-1',
      buildInput({ grupoIds: ['grupo-1', 'grupo-2'] }),
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.grupoColaboradorMembro.createMany).toHaveBeenCalledWith({
      data: [
        { grupoId: 'grupo-1', membroId: 'membro-novo' },
        { grupoId: 'grupo-2', membroId: 'membro-novo' },
      ],
    });
  });
});
