import { ListClientTimelineUseCase } from './list-client-timeline.use-case';

function buildPrisma(cliente: unknown, eventos: unknown[] = []) {
  return {
    client: {
      cliente: { findFirst: jest.fn().mockResolvedValue(cliente) },
      eventoTimeline: { findMany: jest.fn().mockResolvedValue(eventos) },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('ListClientTimelineUseCase', () => {
  it('retorna NOT_FOUND quando o cliente não existe no escritório', async () => {
    const prisma = buildPrisma(null);
    const result = await new ListClientTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'cliente-x',
      { limit: 30 } as never,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('lista eventos fan-out (entidadeRelacionadaTipo=cliente) resolvendo o nome do autor', async () => {
    const evento = {
      id: 'evento-1',
      tipo: 'CLIENTE_ATUALIZADO',
      titulo: 'Telefone de Ana atualizado',
      descricao: null,
      dataEvento: new Date('2026-01-10T10:00:00.000Z'),
      origem: 'SISTEMA',
      autorId: 'membro-1',
      entidadeRelacionadaTipo: 'cliente',
      entidadeRelacionadaId: 'cliente-1',
      fixado: false,
    };
    const prisma = buildPrisma({ id: 'cliente-1' }, [evento]);
    prisma.client.membro.findMany.mockResolvedValue([
      { id: 'membro-1', usuario: { nome: 'Ana Souza' } },
    ]);

    const result = await new ListClientTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'cliente-1',
      { limit: 30 } as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0].autor).toEqual({ id: 'membro-1', nome: 'Ana Souza' });
      expect(result.value.nextCursor).toBeNull();
    }
    expect(prisma.client.eventoTimeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entidadeRelacionadaTipo: 'cliente',
          entidadeRelacionadaId: 'cliente-1',
        }),
      }),
    );
  });

  it('sinaliza nextCursor quando há mais itens além do limite', async () => {
    const base = {
      titulo: 'Evento',
      descricao: null,
      origem: 'SISTEMA',
      autorId: null,
      entidadeRelacionadaTipo: 'cliente',
      entidadeRelacionadaId: 'cliente-1',
      fixado: false,
    };
    const eventos = [
      { ...base, id: 'e1', tipo: 'CLIENTE_ATUALIZADO', dataEvento: new Date('2026-01-03T00:00:00.000Z') },
      { ...base, id: 'e2', tipo: 'CLIENTE_ATUALIZADO', dataEvento: new Date('2026-01-02T00:00:00.000Z') },
    ];
    const prisma = buildPrisma({ id: 'cliente-1' }, eventos);

    const result = await new ListClientTimelineUseCase(prisma as never).execute(
      'escritorio-1',
      'cliente-1',
      { limit: 1 } as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.nextCursor).toBe('2026-01-03T00:00:00.000Z');
    }
  });
});
