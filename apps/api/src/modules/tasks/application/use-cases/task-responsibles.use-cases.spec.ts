import {
  AddResponsavelAuxiliarUseCase,
  RemoveResponsavelAuxiliarUseCase,
} from './task-responsibles.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      tarefaResponsavelAuxiliar: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    },
  };
}

describe('AddResponsavelAuxiliarUseCase', () => {
  it('retorna NOT_FOUND quando o membro não pertence ao escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.membro.findFirst.mockResolvedValue(null);

    const result = await new AddResponsavelAuxiliarUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        membroId: 'membro-x',
      },
    );

    expect(result.ok).toBe(false);
    expect(prisma.client.tarefaResponsavelAuxiliar.create).not.toHaveBeenCalled();
  });

  it('não duplica vínculo já existente', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.membro.findFirst.mockResolvedValue({ id: 'membro-1' });
    prisma.client.tarefaResponsavelAuxiliar.findFirst.mockResolvedValue({ id: 'ja-existe' });

    const result = await new AddResponsavelAuxiliarUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        membroId: 'membro-1',
      },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefaResponsavelAuxiliar.create).not.toHaveBeenCalled();
  });
});

describe('RemoveResponsavelAuxiliarUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue(null);
    const result = await new RemoveResponsavelAuxiliarUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-x',
      'membro-1',
    );
    expect(result.ok).toBe(false);
  });
});
