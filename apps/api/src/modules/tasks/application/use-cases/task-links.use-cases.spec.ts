import { AddTaskLinkUseCase, RemoveTaskLinkUseCase } from './task-links.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: { findFirst: jest.fn() },
      cliente: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      documento: { findFirst: jest.fn() },
      tarefaVinculo: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    },
  };
}

describe('AddTaskLinkUseCase', () => {
  it('valida a existência de Cliente/Processo/Documento antes de vincular', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.cliente.findFirst.mockResolvedValue(null);

    const result = await new AddTaskLinkUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        tipoRecurso: 'CLIENTE',
        recursoId: 'cliente-x',
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.tarefaVinculo.create).not.toHaveBeenCalled();
  });

  it('cria o vínculo quando o Cliente existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.tarefaVinculo.create.mockResolvedValue({ id: 'vinculo-1' });

    const result = await new AddTaskLinkUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        tipoRecurso: 'CLIENTE',
        recursoId: 'cliente-1',
      },
    );

    expect(result.ok).toBe(true);
  });

  it('não valida existência para recursos catálogo-pronto (ex.: CONTRATO)', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.tarefaVinculo.create.mockResolvedValue({ id: 'vinculo-1' });

    const result = await new AddTaskLinkUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      {
        tipoRecurso: 'CONTRATO',
        recursoId: 'contrato-qualquer',
      },
    );

    expect(result.ok).toBe(true);
  });
});

describe('RemoveTaskLinkUseCase', () => {
  it('retorna NOT_FOUND quando o vínculo não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefaVinculo.findFirst.mockResolvedValue(null);
    const result = await new RemoveTaskLinkUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'vinculo-x',
    );
    expect(result.ok).toBe(false);
  });
});
