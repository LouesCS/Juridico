import { ListTaskTimelineUseCase } from './list-task-timeline.use-case';

function buildPrisma(tarefa: unknown, eventos: unknown[] = []) {
  return {
    client: {
      tarefa: { findFirst: jest.fn().mockResolvedValue(tarefa) },
      eventoTimeline: { findMany: jest.fn().mockResolvedValue(eventos) },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('ListTaskTimelineUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe no escritório', async () => {
    const prisma = buildPrisma(null);
    const result = await new ListTaskTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-x',
      { limit: 30 } as never,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('lista eventos da tarefa resolvendo o nome do autor', async () => {
    const evento = {
      id: 'evento-1',
      tipo: 'CRIACAO_TAREFA',
      titulo: 'Tarefa criada',
      descricao: null,
      dataEvento: new Date('2026-01-10T10:00:00.000Z'),
      origem: 'SISTEMA',
      autorId: 'membro-1',
      entidadeRelacionadaTipo: null,
      entidadeRelacionadaId: null,
      fixado: false,
    };
    const prisma = buildPrisma({ id: 'tarefa-1' }, [evento]);
    prisma.client.membro.findMany.mockResolvedValue([
      { id: 'membro-1', usuario: { nome: 'Ana Souza' } },
    ]);

    const result = await new ListTaskTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      { limit: 30 } as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0].autor).toEqual({ id: 'membro-1', nome: 'Ana Souza' });
      expect(result.value.nextCursor).toBeNull();
    }
  });

  it('sinaliza nextCursor quando há mais itens além do limite', async () => {
    const base = {
      titulo: 'Evento',
      descricao: null,
      origem: 'SISTEMA',
      autorId: null,
      entidadeRelacionadaTipo: null,
      entidadeRelacionadaId: null,
      fixado: false,
    };
    const eventos = [
      {
        ...base,
        id: 'e1',
        tipo: 'CRIACAO_TAREFA',
        dataEvento: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        ...base,
        id: 'e2',
        tipo: 'CRIACAO_TAREFA',
        dataEvento: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];
    const prisma = buildPrisma({ id: 'tarefa-1' }, eventos);

    const result = await new ListTaskTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      { limit: 1 } as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.nextCursor).toBe('2026-01-03T00:00:00.000Z');
    }
  });
});
