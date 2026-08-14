import { CreateTaskTemplateUseCase, UpdateTaskTemplateUseCase } from './task-templates.use-cases';

function buildPrisma() {
  return {
    client: {
      modeloTarefa: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      categoriaTarefa: { findFirst: jest.fn() },
    },
  };
}

describe('CreateTaskTemplateUseCase', () => {
  it('retorna NOT_FOUND quando categoriaId não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue(null);

    const result = await new CreateTaskTemplateUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Contestação Padrão',
      categoriaId: 'categoria-x',
      prazoDiasPadrao: 15,
      prioridadePadrao: 'ALTA',
      checklist: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.modeloTarefa.create).not.toHaveBeenCalled();
  });

  it('rejeita nome duplicado (DUPLICATE_NAME)', async () => {
    const prisma = buildPrisma();
    prisma.client.modeloTarefa.findFirst.mockResolvedValue({ id: 'existente' });

    const result = await new CreateTaskTemplateUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Contestação Padrão',
      prazoDiasPadrao: 15,
      prioridadePadrao: 'ALTA',
      checklist: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_NAME');
  });

  it('cria quando categoria existe e nome é único', async () => {
    const prisma = buildPrisma();
    prisma.client.categoriaTarefa.findFirst.mockResolvedValue({ id: 'categoria-1' });
    prisma.client.modeloTarefa.findFirst.mockResolvedValue(null);
    prisma.client.modeloTarefa.create.mockResolvedValue({ id: 'modelo-1' });

    const result = await new CreateTaskTemplateUseCase(prisma as never).execute('escritorio-1', {
      nome: 'Contestação Padrão',
      categoriaId: 'categoria-1',
      prazoDiasPadrao: 15,
      prioridadePadrao: 'ALTA',
      checklist: [],
    });

    expect(result.ok).toBe(true);
  });
});

describe('UpdateTaskTemplateUseCase', () => {
  it('retorna NOT_FOUND quando o modelo não existe', async () => {
    const prisma = buildPrisma();
    prisma.client.modeloTarefa.findFirst.mockResolvedValue(null);

    const result = await new UpdateTaskTemplateUseCase(prisma as never).execute(
      'escritorio-1',
      'x',
      {
        ativo: false,
      },
    );

    expect(result.ok).toBe(false);
  });
});
