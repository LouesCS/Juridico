import {
  AddCollaboratorGroupMemberUseCase,
  RemoveCollaboratorGroupMemberUseCase,
} from './collaborator-groups.use-cases';

function buildPrisma() {
  return {
    client: {
      grupoColaboradores: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      grupoColaboradorMembro: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    },
  };
}

describe('AddCollaboratorGroupMemberUseCase', () => {
  it('retorna NOT_FOUND quando o grupo não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.grupoColaboradores.findFirst.mockResolvedValue(null);
    const result = await new AddCollaboratorGroupMemberUseCase(prisma as never).execute(
      'escritorio-1',
      'grupo-x',
      { membroId: 'membro-1' },
    );
    expect(result.ok).toBe(false);
    expect(prisma.client.membro.findFirst).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando o membro não pertence ao escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.grupoColaboradores.findFirst.mockResolvedValue({ id: 'grupo-1' });
    prisma.client.membro.findFirst.mockResolvedValue(null);
    const result = await new AddCollaboratorGroupMemberUseCase(prisma as never).execute(
      'escritorio-1',
      'grupo-1',
      { membroId: 'membro-x' },
    );
    expect(result.ok).toBe(false);
  });

  it('não duplica vínculo quando o membro já está no grupo', async () => {
    const prisma = buildPrisma();
    prisma.client.grupoColaboradores.findFirst.mockResolvedValue({ id: 'grupo-1' });
    prisma.client.membro.findFirst.mockResolvedValue({ id: 'membro-1' });
    prisma.client.grupoColaboradorMembro.findFirst.mockResolvedValue({ id: 'vinculo-existente' });

    const result = await new AddCollaboratorGroupMemberUseCase(prisma as never).execute(
      'escritorio-1',
      'grupo-1',
      { membroId: 'membro-1' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.grupoColaboradorMembro.create).not.toHaveBeenCalled();
  });

  it('adiciona o membro quando ainda não está no grupo', async () => {
    const prisma = buildPrisma();
    prisma.client.grupoColaboradores.findFirst.mockResolvedValue({ id: 'grupo-1' });
    prisma.client.membro.findFirst.mockResolvedValue({ id: 'membro-1' });
    prisma.client.grupoColaboradorMembro.findFirst.mockResolvedValue(null);

    const result = await new AddCollaboratorGroupMemberUseCase(prisma as never).execute(
      'escritorio-1',
      'grupo-1',
      { membroId: 'membro-1' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.grupoColaboradorMembro.create).toHaveBeenCalledWith({
      data: { grupoId: 'grupo-1', membroId: 'membro-1' },
    });
  });
});

describe('RemoveCollaboratorGroupMemberUseCase', () => {
  it('retorna NOT_FOUND quando o grupo não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.grupoColaboradores.findFirst.mockResolvedValue(null);
    const result = await new RemoveCollaboratorGroupMemberUseCase(prisma as never).execute(
      'escritorio-1',
      'grupo-x',
      'membro-1',
    );
    expect(result.ok).toBe(false);
    expect(prisma.client.grupoColaboradorMembro.deleteMany).not.toHaveBeenCalled();
  });
});
