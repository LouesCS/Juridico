import { AddDependencyUseCase, RemoveDependencyUseCase } from './task-dependencies.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      tarefaDependencia: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    },
  };
}

describe('AddDependencyUseCase', () => {
  it('rejeita auto-dependência', async () => {
    const prisma = buildPrisma();
    const result = await new AddDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        dependeDeId: 'tarefa-1',
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });

  it('retorna NOT_FOUND quando a tarefa dependente não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'tarefa-2' });
    const result = await new AddDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        dependeDeId: 'tarefa-2',
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejeita ciclo direto (B já depende de A)', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'x' });
    prisma.client.tarefaDependencia.findFirst.mockResolvedValueOnce({ id: 'dep-existente' }); // ciclo direto

    const result = await new AddDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        dependeDeId: 'tarefa-2',
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
    expect(prisma.client.tarefaDependencia.create).not.toHaveBeenCalled();
  });

  it('cria a dependência quando válida', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'x' });
    prisma.client.tarefaDependencia.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await new AddDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        dependeDeId: 'tarefa-2',
      },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefaDependencia.create).toHaveBeenCalledWith({
      data: { tarefaId: 'tarefa-1', dependeDeId: 'tarefa-2' },
    });
  });

  it('é idempotente quando a dependência já existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'x' });
    prisma.client.tarefaDependencia.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'ja-existe' });

    const result = await new AddDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        dependeDeId: 'tarefa-2',
      },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefaDependencia.create).not.toHaveBeenCalled();
  });
});

describe('RemoveDependencyUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue(null);
    const result = await new RemoveDependencyUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'tarefa-2',
    );
    expect(result.ok).toBe(false);
  });
});
