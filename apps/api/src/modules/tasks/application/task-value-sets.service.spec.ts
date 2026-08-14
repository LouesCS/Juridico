import { TaskValueSetsService } from './task-value-sets.service';

function buildPrisma() {
  return {
    client: {
      conjuntoValores: { findFirst: jest.fn(), create: jest.fn() },
      conjuntoValorItem: { create: jest.fn(), update: jest.fn() },
      tarefa: { updateMany: jest.fn() },
    },
  };
}

describe('TaskValueSetsService', () => {
  it('reaproveita o Conjunto de Valores "Status de Tarefa" se já existir', async () => {
    const prisma = buildPrisma();
    const existente = {
      id: 'conjunto-1',
      nome: 'Status de Tarefa',
      itens: [
        { id: 'item-1', valor: 'A Fazer', ordem: 0, ativo: true },
        { id: 'item-2', valor: 'Fazendo', ordem: 1, ativo: true },
        { id: 'item-3', valor: 'Concluídos', ordem: 2, ativo: true },
        { id: 'item-4', valor: 'Cancelados', ordem: 3, ativo: true },
      ],
    };
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(existente);

    const result = await new TaskValueSetsService(prisma as never).ensureStatusValueSet(
      'escritorio-1',
    );

    expect(result.itens).toEqual(existente.itens);
    expect(prisma.client.conjuntoValores.create).not.toHaveBeenCalled();
  });

  it('cria "Status de Tarefa" com 5 itens padrão quando não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(null);
    prisma.client.conjuntoValores.create.mockResolvedValue({
      id: 'conjunto-1',
      itens: ['A Fazer', 'Fazendo', 'Concluídos', 'Cancelados'].map((valor, ordem) => ({
        id: `item-${ordem}`,
        valor,
        ordem,
        ativo: true,
      })),
    });

    await new TaskValueSetsService(prisma as never).ensureStatusValueSet('escritorio-1');

    expect(prisma.client.conjuntoValores.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          escritorioId: 'escritorio-1',
          nome: 'Status de Tarefa',
          itens: { create: expect.arrayContaining([{ valor: 'A Fazer', ordem: 0 }]) },
        }),
      }),
    );
    expect(prisma.client.conjuntoValores.create.mock.calls[0][0].data.itens.create).toHaveLength(4);
  });

  it('cria "Prioridade de Tarefa" com 4 itens padrão quando não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.conjuntoValores.findFirst.mockResolvedValue(null);
    prisma.client.conjuntoValores.create.mockResolvedValue({ id: 'conjunto-2', itens: [] });

    await new TaskValueSetsService(prisma as never).ensurePrioridadeValueSet('escritorio-1');

    const callArg = prisma.client.conjuntoValores.create.mock.calls[0][0];
    expect(callArg.data.nome).toBe('Prioridade de Tarefa');
    expect(callArg.data.itens.create).toHaveLength(4);
  });
});
