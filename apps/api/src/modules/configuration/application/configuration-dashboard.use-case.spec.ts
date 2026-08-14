import { ConfigurationDashboardUseCase } from './configuration-dashboard.use-case';

function buildPrisma() {
  return {
    client: {
      campoExtra: { count: jest.fn().mockResolvedValue(3) },
      categoriaTarefa: { count: jest.fn().mockResolvedValue(2) },
      conjuntoValores: { count: jest.fn().mockResolvedValue(1) },
      modeloTarefa: { count: jest.fn().mockResolvedValue(4) },
      grupoColaboradores: { count: jest.fn().mockResolvedValue(5) },
      cargo: { count: jest.fn().mockResolvedValue(6) },
      membro: { count: jest.fn().mockResolvedValue(10) },
      logAuditoria: { findMany: jest.fn().mockResolvedValue([{ id: 'log-1' }]) },
    },
  };
}

describe('ConfigurationDashboardUseCase', () => {
  it('agrega contagens, consumo de IA (reaproveitado) e providers disponíveis', async () => {
    const prisma = buildPrisma();
    const aiUsage = { execute: jest.fn().mockResolvedValue({ resumosGerados: 7, cotaMensal: 20 }) };
    const providerRegistry = {
      listNames: jest.fn().mockReturnValue(['fake', 'openai', 'anthropic', 'gemini', 'ollama']),
    };

    const useCase = new ConfigurationDashboardUseCase(
      prisma as never,
      aiUsage as never,
      providerRegistry as never,
    );
    const result = await useCase.execute('escritorio-1');

    expect(result).toEqual({
      quantidadeCamposExtra: 3,
      quantidadeCategorias: 2,
      quantidadeConjuntos: 1,
      quantidadeModelos: 4,
      quantidadeGrupos: 5,
      quantidadeCargos: 6,
      quantidadeUsuarios: 10,
      quantidadeProvidersIa: 5,
      consumoIa: { resumosGerados: 7, cotaMensal: 20 },
      ultimasAlteracoes: [{ id: 'log-1' }],
    });
    expect(aiUsage.execute).toHaveBeenCalledWith('escritorio-1');
  });

  it('filtra últimas alterações apenas por recursos do Configuration Engine', async () => {
    const prisma = buildPrisma();
    const aiUsage = { execute: jest.fn().mockResolvedValue({}) };
    const providerRegistry = { listNames: jest.fn().mockReturnValue([]) };

    await new ConfigurationDashboardUseCase(
      prisma as never,
      aiUsage as never,
      providerRegistry as never,
    ).execute('escritorio-1');

    const where = prisma.client.logAuditoria.findMany.mock.calls[0][0].where;
    expect(where.escritorioId).toBe('escritorio-1');
    expect(where.recursoTipo.in).toContain('CAMPO_EXTRA');
    expect(where.recursoTipo.in).toContain('CONFIGURACAO_IA');
  });
});
