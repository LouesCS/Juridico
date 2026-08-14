import {
  CreateManualTimelineEventUseCase,
  DeleteManualTimelineEventUseCase,
  UpdateManualTimelineEventUseCase,
} from './manual-timeline-event.use-cases';

describe('CreateManualTimelineEventUseCase', () => {
  const prisma = {
    client: { processo: { findFirst: jest.fn() }, eventoTimeline: { create: jest.fn() } },
  };

  beforeEach(() => jest.clearAllMocks());

  it('cria o evento com origem MANUAL e o autor informado', async () => {
    prisma.client.processo.findFirst.mockResolvedValue({ id: 'processo-1' });
    prisma.client.eventoTimeline.create.mockResolvedValue({ id: 'evento-1' });

    const result = await new CreateManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'membro-1',
      { tipo: 'ANOTACAO', titulo: 'Ligação com o cliente' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.eventoTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ origem: 'MANUAL', autorId: 'membro-1' }),
      }),
    );
  });

  it('retorna NOT_FOUND quando o processo não existe', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await new CreateManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-x',
      'membro-1',
      { tipo: 'ANOTACAO', titulo: 'Nota' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('UpdateManualTimelineEventUseCase / DeleteManualTimelineEventUseCase', () => {
  const prisma = {
    client: { eventoTimeline: { findFirst: jest.fn(), update: jest.fn() } },
  };

  beforeEach(() => jest.clearAllMocks());

  it('bloqueia editar evento de origem SISTEMA (SYSTEM_EVENT_NOT_DELETABLE)', async () => {
    prisma.client.eventoTimeline.findFirst.mockResolvedValue({
      id: 'e1',
      origem: 'SISTEMA',
      autorId: null,
    });

    const result = await new UpdateManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'e1',
      { membroId: 'membro-1', podeEditarQualquer: false },
      { fixado: true },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SYSTEM_EVENT_NOT_DELETABLE');
  });

  it('bloqueia editar anotação de outro autor sem permissão case:update (FORBIDDEN)', async () => {
    prisma.client.eventoTimeline.findFirst.mockResolvedValue({
      id: 'e1',
      origem: 'MANUAL',
      autorId: 'membro-2',
    });

    const result = await new UpdateManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'e1',
      { membroId: 'membro-1', podeEditarQualquer: false },
      { fixado: true },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('permite editar anotação de outro autor quando o ator tem case:update', async () => {
    prisma.client.eventoTimeline.findFirst.mockResolvedValue({
      id: 'e1',
      origem: 'MANUAL',
      autorId: 'membro-2',
    });

    const result = await new UpdateManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'e1',
      { membroId: 'membro-1', podeEditarQualquer: true },
      { fixado: true },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.eventoTimeline.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { fixado: true },
    });
  });

  it('permite ao próprio autor excluir sua anotação manual', async () => {
    prisma.client.eventoTimeline.findFirst.mockResolvedValue({
      id: 'e1',
      origem: 'MANUAL',
      autorId: 'membro-1',
    });

    const result = await new DeleteManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'e1',
      { membroId: 'membro-1', podeEditarQualquer: false },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.eventoTimeline.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });

  it('bloqueia excluir evento de origem SISTEMA', async () => {
    prisma.client.eventoTimeline.findFirst.mockResolvedValue({
      id: 'e1',
      origem: 'SISTEMA',
      autorId: null,
    });

    const result = await new DeleteManualTimelineEventUseCase(prisma as never).execute(
      'escritorio-1',
      'processo-1',
      'e1',
      { membroId: 'membro-1', podeEditarQualquer: true },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SYSTEM_EVENT_NOT_DELETABLE');
  });
});
