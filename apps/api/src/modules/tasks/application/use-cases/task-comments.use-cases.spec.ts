import { CreateTaskCommentUseCase, ListTaskCommentsUseCase } from './task-comments.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      comentario: { create: jest.fn(), findMany: jest.fn() },
    },
  };
}

describe('CreateTaskCommentUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue(null);
    const timeline = { record: jest.fn() };

    const result = await new CreateTaskCommentUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-x',
      'membro-1',
      { conteudo: 'Olá' },
    );

    expect(result.ok).toBe(false);
    expect(prisma.client.comentario.create).not.toHaveBeenCalled();
  });

  it('cria o comentário e registra evento COMENTARIO na Timeline', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1', titulo: 'X' });
    prisma.client.comentario.create.mockResolvedValue({ id: 'comentario-1' });
    const timeline = { record: jest.fn() };

    const result = await new CreateTaskCommentUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
      { conteudo: 'Olá' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.comentario.create).toHaveBeenCalledWith({
      data: {
        escritorioId: 'escritorio-1',
        tarefaId: 'tarefa-1',
        autorId: 'membro-1',
        conteudo: 'Olá',
      },
      select: { id: true },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COMENTARIO', tarefaId: 'tarefa-1' }),
    );
  });
});

describe('ListTaskCommentsUseCase', () => {
  it('lista comentários ordenados por criadoEm asc', async () => {
    const prisma = buildPrisma();
    prisma.client.comentario.findMany.mockResolvedValue([]);

    await new ListTaskCommentsUseCase(prisma as never).execute('escritorio-1', 'tarefa-1');

    expect(prisma.client.comentario.findMany).toHaveBeenCalledWith({
      where: { tarefaId: 'tarefa-1', escritorioId: 'escritorio-1' },
      orderBy: { criadoEm: 'asc' },
    });
  });
});
