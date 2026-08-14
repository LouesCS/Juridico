import { CreateTaskUseCase } from './create-task.use-case';

function buildPrisma() {
  return {
    client: {
      categoriaTarefa: { findFirst: jest.fn() },
      conjuntoValorItem: { findFirst: jest.fn() },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
      equipe: { findFirst: jest.fn() },
      grupoColaboradores: { findFirst: jest.fn() },
      tarefa: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      tarefaRecorrencia: { create: jest.fn() },
      processo: { findFirst: jest.fn() },
      pastaJuridica: { findFirst: jest.fn() },
    },
  };
}

function buildDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    titulo: 'Contestação',
    responsaveisAuxiliaresIds: [],
    checklist: [],
    dependeDeIds: [],
    vinculos: [],
    ...overrides,
  } as never;
}

describe('CreateTaskUseCase', () => {
  it('cria a tarefa com status/prioridade padrão quando não informados', async () => {
    const prisma = buildPrisma();
    const valueSets = {
      ensureStatusValueSet: jest
        .fn()
        .mockResolvedValue({ itens: [{ id: 'status-1', valor: 'A Fazer' }] }),
      ensurePrioridadeValueSet: jest
        .fn()
        .mockResolvedValue({ itens: [{ id: 'prioridade-1', valor: 'Média' }] }),
    };
    const timeline = { record: jest.fn() };
    prisma.client.tarefa.create.mockResolvedValue({ id: 'tarefa-1' });

    const result = await new CreateTaskUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute('escritorio-1', 'membro-1', buildDto());

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusId: 'status-1', prioridadeId: 'prioridade-1' }),
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tarefaId: 'tarefa-1', tipo: 'CRIACAO_TAREFA' }),
    );
  });

  it('não busca defaults quando statusId/prioridadeId já foram informados', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValorItem.findFirst.mockResolvedValue({ id: 'status-x' });
    const valueSets = { ensureStatusValueSet: jest.fn(), ensurePrioridadeValueSet: jest.fn() };
    const timeline = { record: jest.fn() };
    prisma.client.tarefa.create.mockResolvedValue({ id: 'tarefa-1' });

    await new CreateTaskUseCase(prisma as never, valueSets as never, timeline as never).execute(
      'escritorio-1',
      'membro-1',
      buildDto({ statusId: 'status-x', prioridadeId: 'prioridade-x' }),
    );

    expect(valueSets.ensureStatusValueSet).not.toHaveBeenCalled();
    expect(valueSets.ensurePrioridadeValueSet).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando a categoria não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue(null);
    const valueSets = { ensureStatusValueSet: jest.fn(), ensurePrioridadeValueSet: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new CreateTaskUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute('escritorio-1', 'membro-1', buildDto({ categoriaId: 'categoria-x' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.tarefa.create).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando uma dependência informada não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findMany.mockResolvedValue([]); // nenhuma das dependências encontrada
    const valueSets = {
      ensureStatusValueSet: jest.fn().mockResolvedValue({ itens: [{ id: 's1' }] }),
      ensurePrioridadeValueSet: jest.fn().mockResolvedValue({ itens: [{ id: 'p1' }] }),
    };
    const timeline = { record: jest.fn() };

    const result = await new CreateTaskUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute('escritorio-1', 'membro-1', buildDto({ dependeDeIds: ['tarefa-inexistente'] }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
  it('rejeita vínculo contextual com Processo de outro tenant', async () => {
    const prisma = buildPrisma();
    prisma.client.processo.findFirst.mockResolvedValue(null);
    const valueSets = { ensureStatusValueSet: jest.fn(), ensurePrioridadeValueSet: jest.fn() };
    const timeline = { record: jest.fn() };
    const result = await new CreateTaskUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute(
      'escritorio-1',
      'membro-1',
      buildDto({ vinculos: [{ tipoRecurso: 'PROCESSO', recursoId: 'processo-outro-tenant' }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.processo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'processo-outro-tenant', escritorioId: 'escritorio-1' },
      }),
    );
    expect(prisma.client.tarefa.create).not.toHaveBeenCalled();
  });
});
