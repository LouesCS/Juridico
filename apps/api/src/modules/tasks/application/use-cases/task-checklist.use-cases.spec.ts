import {
  AddChecklistItemUseCase,
  RemoveChecklistItemUseCase,
  UpdateChecklistItemUseCase,
} from './task-checklist.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      tarefaChecklistItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };
}

describe('AddChecklistItemUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue(null);
    const result = await new AddChecklistItemUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-x',
      {
        titulo: 'Revisar',
        obrigatorio: false,
        ordem: 0,
      },
    );
    expect(result.ok).toBe(false);
  });

  it('cria o item de checklist', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.tarefaChecklistItem.create.mockResolvedValue({ id: 'item-1' });
    const result = await new AddChecklistItemUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        titulo: 'Revisar',
        obrigatorio: true,
        ordem: 0,
      },
    );
    expect(result.ok).toBe(true);
  });
});

describe('UpdateChecklistItemUseCase', () => {
  it('marca concluído com concluidoEm/concluidoPorId', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefaChecklistItem.findFirst.mockResolvedValue({ id: 'item-1' });

    await new UpdateChecklistItemUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'item-1',
      'membro-1',
      {
        concluido: true,
      },
    );

    expect(prisma.client.tarefaChecklistItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { concluidoEm: expect.any(Date), concluidoPorId: 'membro-1' },
    });
  });

  it('desmarca conclusão limpando concluidoEm/concluidoPorId', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefaChecklistItem.findFirst.mockResolvedValue({ id: 'item-1' });

    await new UpdateChecklistItemUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'item-1',
      'membro-1',
      {
        concluido: false,
      },
    );

    expect(prisma.client.tarefaChecklistItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { concluidoEm: null, concluidoPorId: null },
    });
  });
});

describe('RemoveChecklistItemUseCase', () => {
  it('retorna NOT_FOUND quando o item não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefaChecklistItem.findFirst.mockResolvedValue(null);
    const result = await new RemoveChecklistItemUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'item-x',
    );
    expect(result.ok).toBe(false);
    expect(prisma.client.tarefaChecklistItem.delete).not.toHaveBeenCalled();
  });
});
