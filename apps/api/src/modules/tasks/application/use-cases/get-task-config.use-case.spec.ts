import { GetTaskConfigUseCase } from './get-task-config.use-case';

describe('GetTaskConfigUseCase', () => {
  it('retorna os itens de status e prioridade auto-provisionados', async () => {
    const valueSets = {
      ensureStatusValueSet: jest.fn().mockResolvedValue({
        itens: [{ id: 's1', valor: 'A Fazer', ordem: 0 }],
      }),
      ensurePrioridadeValueSet: jest.fn().mockResolvedValue({
        itens: [{ id: 'p1', valor: 'Baixa', ordem: 0 }],
      }),
    };

    const result = await new GetTaskConfigUseCase(valueSets as never).execute('escritorio-1');

    expect(result).toEqual({
      status: [{ id: 's1', valor: 'A Fazer', ordem: 0 }],
      prioridade: [{ id: 'p1', valor: 'Baixa', ordem: 0 }],
    });
  });
});
