import { CreateTaskFromTemplateUseCase } from './create-task-from-template.use-case';

function buildPrisma() {
  return {
    client: {
      modeloTarefa: { findFirst: jest.fn() },
      tarefa: { create: jest.fn() },
    },
  };
}

describe('CreateTaskFromTemplateUseCase', () => {
  it('retorna NOT_FOUND quando o modelo não existe ou está inativo', async () => {
    const prisma = buildPrisma();
    prisma.client.modeloTarefa.findFirst.mockResolvedValue(null);
    const valueSets = { ensureStatusValueSet: jest.fn(), ensurePrioridadeValueSet: jest.fn() };
    const timeline = { record: jest.fn() };

    const result = await new CreateTaskFromTemplateUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute('escritorio-1', 'membro-1', { modeloId: 'modelo-x' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('cria a tarefa copiando categoria/checklist e resolvendo a prioridade pelo label', async () => {
    const prisma = buildPrisma();
    prisma.client.modeloTarefa.findFirst.mockResolvedValue({
      id: 'modelo-1',
      nome: 'Contestação Padrão',
      descricao: 'desc',
      categoriaId: 'categoria-1',
      prazoDiasPadrao: 15,
      prioridadePadrao: 'ALTA',
      checklist: ['Revisar fatos', 'Anexar documentos'],
    });
    const valueSets = {
      ensureStatusValueSet: jest
        .fn()
        .mockResolvedValue({ itens: [{ id: 'status-1', valor: 'A Fazer' }] }),
      ensurePrioridadeValueSet: jest.fn().mockResolvedValue({
        itens: [
          { id: 'p-baixa', valor: 'Baixa' },
          { id: 'p-alta', valor: 'Alta' },
        ],
      }),
    };
    const timeline = { record: jest.fn() };
    prisma.client.tarefa.create.mockResolvedValue({ id: 'tarefa-1' });

    const result = await new CreateTaskFromTemplateUseCase(
      prisma as never,
      valueSets as never,
      timeline as never,
    ).execute('escritorio-1', 'membro-1', { modeloId: 'modelo-1' });

    expect(result.ok).toBe(true);
    expect(prisma.client.tarefa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: 'Contestação Padrão',
          categoriaId: 'categoria-1',
          prioridadeId: 'p-alta',
          modeloOrigemId: 'modelo-1',
          checklist: {
            create: [
              { titulo: 'Revisar fatos', obrigatorio: false, ordem: 0 },
              { titulo: 'Anexar documentos', obrigatorio: false, ordem: 1 },
            ],
          },
        }),
      }),
    );
  });
});
