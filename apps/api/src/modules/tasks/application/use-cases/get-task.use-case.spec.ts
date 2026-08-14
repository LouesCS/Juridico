import { GetTaskUseCase } from './get-task.use-case';

function buildPrisma(tarefa: unknown) {
  return {
    client: {
      tarefa: { findFirst: jest.fn().mockResolvedValue(tarefa) },
      categoriaTarefa: { findFirst: jest.fn().mockResolvedValue(null) },
      conjuntoValorItem: { findFirst: jest.fn().mockResolvedValue(null) },
      membro: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };
}

describe('GetTaskUseCase', () => {
  it('retorna NOT_FOUND quando a tarefa não existe no escritório', async () => {
    const prisma = buildPrisma(null);
    const result = await new GetTaskUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-x',
      'membro-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('marca favorita=true quando o membro já favoritou', async () => {
    const tarefa = {
      id: 'tarefa-1',
      titulo: 'Contestação',
      descricao: null,
      categoriaId: null,
      statusId: null,
      prioridadeId: null,
      responsavelPrincipalId: null,
      responsaveisAuxiliares: [],
      equipeId: null,
      grupoColaboradoresId: null,
      dataInicio: null,
      dataVencimento: null,
      concluidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
      arquivadaEm: null,
      recorrenciaId: null,
      tarefaOrigemId: null,
      checklist: [],
      vinculos: [],
      dependencias: [],
      bloqueando: [],
      favoritos: [{ tarefaId: 'tarefa-1', membroId: 'membro-1' }],
      criadoPorId: 'membro-1',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    const prisma = buildPrisma(tarefa);

    const result = await new GetTaskUseCase(prisma as never).execute(
      'escritorio-1',
      'tarefa-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.favorita).toBe(true);
  });
});
