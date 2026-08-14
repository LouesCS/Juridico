import { ListCaseTimelineUseCase } from './list-case-timeline.use-case';
import { ListCaseTimelineQuery } from '../../presentation/schemas/timeline.schemas';

describe('ListCaseTimelineUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      eventoTimeline: { findMany: jest.fn() },
      prazo: { findMany: jest.fn() },
      membro: { findMany: jest.fn() },
    },
  };

  function buildUseCase() {
    return new ListCaseTimelineUseCase(prisma as never);
  }

  const baseQuery: ListCaseTimelineQuery = { limit: 30 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.processo.findFirst.mockResolvedValue({ id: 'processo-1' });
    prisma.client.membro.findMany.mockResolvedValue([{ id: 'membro-1', usuario: { nome: 'Ana' } }]);
  });

  it('retorna NOT_FOUND quando o processo não existe no escritório', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'processo-x', baseQuery);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('mescla EventoTimeline real com a projeção de Prazo, ordenado por data desc', async () => {
    prisma.client.eventoTimeline.findMany.mockResolvedValue([
      {
        id: 'evento-1',
        tipo: 'CRIACAO_PROCESSO',
        titulo: 'Processo criado',
        descricao: null,
        dataEvento: new Date('2026-08-01T10:00:00.000Z'),
        origem: 'SISTEMA',
        autorId: 'membro-1',
        entidadeRelacionadaTipo: null,
        entidadeRelacionadaId: null,
        fixado: false,
      },
    ]);
    prisma.client.prazo.findMany.mockResolvedValue([
      {
        id: 'prazo-1',
        titulo: 'Audiência',
        descricao: null,
        dataVencimento: new Date('2026-08-02T10:00:00.000Z'),
        responsavelId: 'membro-1',
        status: 'PENDENTE',
      },
    ]);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', baseQuery);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(2);
    // Prazo (02/08) é mais recente que o evento de criação (01/08) — vem primeiro.
    expect(result.value.items[0].tipo).toBe('PRAZO');
    expect(result.value.items[0].titulo).toBe('Prazo: Audiência');
    expect(result.value.items[1].tipo).toBe('CRIACAO_PROCESSO');
    expect(result.value.items[1].autor).toEqual({ id: 'membro-1', nome: 'Ana' });
  });

  it('sinaliza prazo concluído com título distinto', async () => {
    prisma.client.eventoTimeline.findMany.mockResolvedValue([]);
    prisma.client.prazo.findMany.mockResolvedValue([
      {
        id: 'prazo-1',
        titulo: 'Contestação',
        descricao: null,
        dataVencimento: new Date('2026-08-01T00:00:00.000Z'),
        responsavelId: 'membro-1',
        status: 'CONCLUIDO',
      },
    ]);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', baseQuery);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.items[0].titulo).toBe('Prazo concluído: Contestação');
  });

  it('não projeta Prazo quando o filtro de tipo exclui PRAZO', async () => {
    prisma.client.eventoTimeline.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', 'processo-1', { ...baseQuery, tipo: 'DOCUMENTO' });

    expect(prisma.client.prazo.findMany).not.toHaveBeenCalled();
  });

  it('indica nextCursor quando o total mesclado excede o limite pedido', async () => {
    const eventos = Array.from({ length: 2 }, (_, i) => ({
      id: `evento-${i}`,
      tipo: 'ANOTACAO',
      titulo: `Nota ${i}`,
      descricao: null,
      dataEvento: new Date(`2026-08-0${i + 1}T00:00:00.000Z`),
      origem: 'MANUAL',
      autorId: null,
      entidadeRelacionadaTipo: null,
      entidadeRelacionadaId: null,
      fixado: false,
    }));
    prisma.client.eventoTimeline.findMany.mockResolvedValue(eventos);
    prisma.client.prazo.findMany.mockResolvedValue([]);

    const result = await buildUseCase().execute('escritorio-1', 'processo-1', {
      ...baseQuery,
      limit: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.nextCursor).not.toBeNull();
  });
});
