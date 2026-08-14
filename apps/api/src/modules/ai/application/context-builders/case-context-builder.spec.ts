import { CaseContextBuilder } from './case-context-builder';

function buildPrisma(processo: unknown) {
  return {
    client: {
      processo: { findFirst: jest.fn().mockResolvedValue(processo) },
      prazo: { findMany: jest.fn().mockResolvedValue([]) },
      eventoTimeline: { findMany: jest.fn().mockResolvedValue([]) },
      documento: { findMany: jest.fn().mockResolvedValue([]) },
      membro: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };
}

describe('CaseContextBuilder', () => {
  it('retorna NOT_FOUND sem nenhuma permissão de leitura de processo', async () => {
    const prisma = buildPrisma(null);
    const builder = new CaseContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'processo-1', {
      membroId: 'm1',
      permissions: [],
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND quando o processo não é encontrado pelo where de escopo (fora do escopo/segredo de justiça)', async () => {
    // O `where` já inclui `buildCaseScopeWhere`/`applyConfidentialityFilter` — um processo em
    // segredo de justiça sem `case:read:confidential` simplesmente não retorna do banco.
    const prisma = buildPrisma(null);
    const builder = new CaseContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'processo-1', {
      membroId: 'm1',
      permissions: ['case:read:all'],
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('monta campos/listas/fontes reais quando o processo é acessível', async () => {
    const prisma = buildPrisma({
      id: 'processo-1',
      titulo: 'Ação Trabalhista',
      status: 'ATIVO',
      prioridade: 'ALTA',
      area: 'Trabalhista',
      numeroCnj: '0001234-56.2026.5.02.0001',
      segredoJustica: false,
      cliente: { id: 'cliente-1', nome: 'Roberto Almeida' },
    });
    const builder = new CaseContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'processo-1', {
      membroId: 'm1',
      permissions: ['case:read:all'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.promptContext.campos.Título).toBe('Ação Trabalhista');
      expect(result.value.promptContext.campos.Cliente).toBe('Roberto Almeida');
      expect(result.value.fontes[0]).toMatchObject({
        sourceType: 'METADADO_PROCESSO',
        processoId: 'processo-1',
      });
    }
  });
});
