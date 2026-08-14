import { ClientContextBuilder } from './client-context-builder';

function buildPrisma(cliente: unknown, processos: unknown[] = []) {
  return {
    client: {
      cliente: { findFirst: jest.fn().mockResolvedValue(cliente) },
      processo: { findMany: jest.fn().mockResolvedValue(processos) },
      documento: { findMany: jest.fn().mockResolvedValue([]) },
      prazo: { findFirst: jest.fn().mockResolvedValue(null) },
      membro: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };
}

describe('ClientContextBuilder', () => {
  it('retorna NOT_FOUND sem client:read', async () => {
    const prisma = buildPrisma({ id: 'cliente-1' });
    const builder = new ClientContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'cliente-1', {
      membroId: 'm1',
      permissions: [],
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND quando o cliente não existe', async () => {
    const prisma = buildPrisma(null);
    const builder = new ClientContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'cliente-1', {
      membroId: 'm1',
      permissions: ['client:read'],
    } as never);
    expect(result.ok).toBe(false);
  });

  it('sem nenhum escopo de leitura de processo, o histórico não lista processos (mas ainda funciona)', async () => {
    const prisma = buildPrisma({
      id: 'cliente-1',
      nome: 'Roberto',
      tipo: 'PESSOA_FISICA',
      status: 'ATIVO',
      atualizadoEm: new Date(),
    });
    const builder = new ClientContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'cliente-1', {
      membroId: 'm1',
      permissions: ['client:read'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.promptContext.listas?.['Processos visíveis ao solicitante']).toEqual([]);
      expect(prisma.client.processo.findMany).not.toHaveBeenCalled();
    }
  });

  it('só inclui processos que o usuário pode ler (reaproveita case-scope) — nunca revela um processo fora de escopo', async () => {
    const prisma = buildPrisma(
      {
        id: 'cliente-1',
        nome: 'Roberto',
        tipo: 'PESSOA_FISICA',
        status: 'ATIVO',
        atualizadoEm: new Date(),
      },
      [{ id: 'processo-1', titulo: 'Ação Visível', status: 'ATIVO', atualizadoEm: new Date() }],
    );
    const builder = new ClientContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'cliente-1', {
      membroId: 'm1',
      permissions: ['client:read', 'case:read:all'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.promptContext.listas?.['Processos visíveis ao solicitante']).toEqual([
        'Ação Visível (ATIVO)',
      ]);
      expect(result.value.fontes.some((f) => f.processoId === 'processo-1')).toBe(true);
    }

    // reafirma que o filtro de segredo de justiça/escopo foi aplicado na query, não pós-processado
    const where = prisma.client.processo.findMany.mock.calls[0][0].where;
    expect(where.clienteId).toBe('cliente-1');
    expect(where.segredoJustica).toBe(false);
  });
});
