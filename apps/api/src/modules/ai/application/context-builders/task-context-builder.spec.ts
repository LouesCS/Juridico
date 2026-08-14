import { TaskContextBuilder } from './task-context-builder';

function buildPrisma(tarefa: unknown) {
  return {
    client: {
      membro: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      tarefa: { findFirst: jest.fn().mockResolvedValue(tarefa) },
      categoriaTarefa: { findFirst: jest.fn().mockResolvedValue(null) },
      conjuntoValorItem: { findFirst: jest.fn().mockResolvedValue(null) },
      eventoTimeline: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('TaskContextBuilder', () => {
  it('retorna NOT_FOUND sem permissão de leitura', async () => {
    const prisma = buildPrisma(null);
    const user = { membroId: 'm1', permissions: [] } as never;

    const result = await new TaskContextBuilder(prisma as never).build(
      'escritorio-1',
      'tarefa-1',
      user,
    );

    expect(result.ok).toBe(false);
  });

  it('monta campos/listas/fontes a partir da tarefa, incluindo checklist e dependências pendentes', async () => {
    const tarefa = {
      id: 'tarefa-1',
      titulo: 'Contestação',
      descricao: 'Elaborar contestação',
      categoriaId: null,
      statusId: null,
      prioridadeId: null,
      responsavelPrincipalId: null,
      dataVencimento: new Date('2026-08-10T00:00:00.000Z'),
      concluidaEm: null,
      atualizadoEm: new Date(),
      checklist: [{ titulo: 'Revisar fatos', obrigatorio: true, concluidoEm: null }],
      dependencias: [{ dependeDe: { titulo: 'Coletar provas', concluidaEm: null } }],
    };
    const prisma = buildPrisma(tarefa);
    const user = { membroId: 'm1', permissions: ['task:read:all'] } as never;

    const result = await new TaskContextBuilder(prisma as never).build(
      'escritorio-1',
      'tarefa-1',
      user,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.promptContext.campos.Título).toBe('Contestação');
      expect(result.value.promptContext.listas?.['Checklist pendente']).toEqual([
        'Revisar fatos (obrigatório)',
      ]);
      expect(result.value.promptContext.listas?.['Dependências pendentes']).toEqual([
        'Coletar provas',
      ]);
      expect(result.value.fontes[0]).toEqual(
        expect.objectContaining({ sourceType: 'TAREFA', tarefaId: 'tarefa-1' }),
      );
    }
  });
});
