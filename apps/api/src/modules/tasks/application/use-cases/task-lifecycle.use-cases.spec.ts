import {
  ArchiveTaskUseCase,
  CancelTaskUseCase,
  CompleteTaskUseCase,
  DuplicateTaskUseCase,
  MoveTaskUseCase,
  ReopenTaskUseCase,
  RestoreTaskUseCase,
} from './task-lifecycle.use-cases';

function buildPrisma() {
  return {
    client: {
      tarefa: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      conjuntoValorItem: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      feriado: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('ArchiveTaskUseCase / RestoreTaskUseCase', () => {
  it('arquiva e registra evento ARQUIVAMENTO', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1', titulo: 'Contestação' });
    const timeline = { record: jest.fn() };

    const result = await new ArchiveTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { arquivadaEm: expect.any(Date) },
    });
    expect(timeline.record).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'ARQUIVAMENTO' }));
  });

  it('restaura limpando arquivadaEm e excluidoEm', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1', titulo: 'Contestação' });
    const timeline = { record: jest.fn() };

    await new RestoreTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { arquivadaEm: null, excluidoEm: null },
    });
  });
});

describe('DuplicateTaskUseCase', () => {
  it('copia campos, checklist e vínculos, mas não dependências', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'Contestação',
      descricao: 'desc',
      categoriaId: null,
      statusId: 'status-1',
      prioridadeId: 'prioridade-1',
      responsavelPrincipalId: 'membro-1',
      equipeId: null,
      grupoColaboradoresId: null,
      dataInicio: null,
      dataVencimento: null,
      checklist: [{ titulo: 'Revisar', obrigatorio: true, ordem: 0 }],
      vinculos: [{ tipoRecurso: 'PROCESSO', recursoId: 'processo-1' }],
    });
    prisma.client.tarefa.create.mockResolvedValue({ id: 'tarefa-2' });

    const result = await new DuplicateTaskUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: 'Contestação (cópia)',
          checklist: { create: [{ titulo: 'Revisar', obrigatorio: true, ordem: 0 }] },
          vinculos: { create: [{ tipoRecurso: 'PROCESSO', recursoId: 'processo-1' }] },
        }),
      }),
    );
  });
});

describe('MoveTaskUseCase', () => {
  it('rejeita statusId de outro escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.conjuntoValorItem.findFirst.mockResolvedValue(null);
    const timeline = { record: jest.fn() };

    const result = await new MoveTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
      { statusId: 'status-de-outro-escritorio' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('move e registra ALTERACAO_STATUS', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1' });
    prisma.client.conjuntoValorItem.findFirst.mockResolvedValue({ id: 'status-2' });
    const timeline = { record: jest.fn() };

    const result = await new MoveTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
      { statusId: 'status-2' },
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { statusId: 'status-2' },
    });
  });
});

describe('ReopenTaskUseCase', () => {
  it('rejeita reabrir uma tarefa que não está concluída nem cancelada', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      concluidaEm: null,
      canceladaEm: null,
    });
    const timeline = { record: jest.fn() };

    const result = await new ReopenTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });

  it('reabre limpando concluidaEm/canceladaEm/motivoCancelamento', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'X',
      concluidaEm: new Date(),
      canceladaEm: null,
    });
    const timeline = { record: jest.fn() };

    await new ReopenTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { concluidaEm: null, canceladaEm: null, motivoCancelamento: null },
    });
  });
});

describe('CancelTaskUseCase', () => {
  it('cancela com motivo e registra CANCELAMENTO_TAREFA', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({ id: 'tarefa-1', titulo: 'X' });
    const timeline = { record: jest.fn() };

    await new CancelTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
      {
        motivo: 'Cliente desistiu',
      },
    );

    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { canceladaEm: expect.any(Date), motivoCancelamento: 'Cliente desistiu' },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CANCELAMENTO_TAREFA' }),
    );
  });
});

describe('CompleteTaskUseCase', () => {
  it('bloqueia conclusão com dependência pendente (TASK_DEPENDENCIES_PENDING)', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'X',
      checklist: [],
      dependencias: [{ dependeDe: { concluidaEm: null } }],
      recorrencia: null,
      dataVencimento: null,
    });
    const timeline = { record: jest.fn() };

    const result = await new CompleteTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TASK_DEPENDENCIES_PENDING');
    expect(prisma.client.tarefa.update).not.toHaveBeenCalled();
  });

  it('bloqueia conclusão com checklist obrigatório pendente (TASK_CHECKLIST_PENDING)', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'X',
      checklist: [{ obrigatorio: true, concluidoEm: null }],
      dependencias: [],
      recorrencia: null,
      dataVencimento: null,
    });
    const timeline = { record: jest.fn() };

    const result = await new CompleteTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TASK_CHECKLIST_PENDING');
  });

  it('permite concluir quando checklist opcional está pendente', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'X',
      checklist: [{ obrigatorio: false, concluidoEm: null }],
      dependencias: [],
      recorrencia: null,
      dataVencimento: null,
    });
    const timeline = { record: jest.fn() };

    const result = await new CompleteTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.update).toHaveBeenCalledWith({
      where: { id: 'tarefa-1' },
      data: { concluidaEm: expect.any(Date) },
    });
  });

  it('gera a próxima ocorrência quando a tarefa tem recorrência', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'Relatório mensal',
      descricao: null,
      categoriaId: null,
      statusId: 'status-1',
      prioridadeId: 'prioridade-1',
      responsavelPrincipalId: 'membro-2',
      equipeId: null,
      grupoColaboradoresId: null,
      checklist: [],
      dependencias: [],
      recorrenciaId: 'recorrencia-1',
      recorrencia: {
        frequencia: 'MENSAL',
        intervalo: 1,
        diasSemana: [],
        respeitarDiasUteis: false,
        dataFim: null,
      },
      dataVencimento: new Date('2026-08-04T00:00:00.000Z'),
      criadoPorId: 'membro-1',
    });
    prisma.client.tarefa.create.mockResolvedValue({ id: 'tarefa-2' });
    const timeline = { record: jest.fn() };

    const result = await new CompleteTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.proximaOcorrenciaId).toBe('tarefa-2');
    expect(prisma.client.tarefa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tarefaOrigemId: 'tarefa-1',
          recorrenciaId: 'recorrencia-1',
        }),
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CONCLUSAO_TAREFA' }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tarefaId: 'tarefa-2', tipo: 'CRIACAO_TAREFA' }),
    );
  });

  it('não gera próxima ocorrência quando a tarefa não tem recorrência', async () => {
    const prisma = buildPrisma();
    prisma.client.tarefa.findFirst.mockResolvedValue({
      id: 'tarefa-1',
      titulo: 'X',
      checklist: [],
      dependencias: [],
      recorrencia: null,
      dataVencimento: null,
    });
    const timeline = { record: jest.fn() };

    const result = await new CompleteTaskUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.proximaOcorrenciaId).toBeNull();
    expect(prisma.client.tarefa.create).not.toHaveBeenCalled();
  });
});
