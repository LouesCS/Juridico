import { ToggleTaskFavoriteUseCase } from './task-favorites.use-case';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      tarefaFavorito: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    },
  };
}

describe('ToggleTaskFavoriteUseCase', () => {
  it('favorita quando ainda não era favorita', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.tarefaFavorito.findFirst.mockResolvedValue(null);

    const result = await new ToggleTaskFavoriteUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.favorita).toBe(true);
    expect(prisma.client.tarefaFavorito.create).toHaveBeenCalledWith({
      data: { tarefaId: 'tarefa-1', membroId: 'membro-1' },
    });
  });

  it('desfavorita quando já era favorita', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.tarefaFavorito.findFirst.mockResolvedValue({
      tarefaId: 'tarefa-1',
      membroId: 'membro-1',
    });

    const result = await new ToggleTaskFavoriteUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.favorita).toBe(false);
    expect(prisma.client.tarefaFavorito.delete).toHaveBeenCalledWith({
      where: { tarefaId_membroId: { tarefaId: 'tarefa-1', membroId: 'membro-1' } },
    });
  });
});
