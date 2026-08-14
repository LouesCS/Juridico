import {
  GetAiSettingsUseCase,
  GetFinancialSettingsUseCase,
  GetGeneralSettingsUseCase,
  UpdateAiSettingsUseCase,
  UpdateFinancialSettingsUseCase,
  UpdateGeneralSettingsUseCase,
} from './office-settings.use-cases';

function buildPrisma(escritorio: Record<string, unknown>) {
  return {
    client: {
      escritorio: {
        findFirstOrThrow: jest.fn().mockResolvedValue(escritorio),
        update: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
}

describe('GetGeneralSettingsUseCase / UpdateGeneralSettingsUseCase', () => {
  it('aplica defaults quando configuracoes.geral está vazio', async () => {
    const prisma = buildPrisma({
      fusoHorario: 'America/Sao_Paulo',
      idioma: 'pt-BR',
      configuracoes: {},
    });
    const result = await new GetGeneralSettingsUseCase(prisma as never).execute('escritorio-1');
    expect(result).toEqual({
      fusoHorario: 'America/Sao_Paulo',
      idioma: 'pt-BR',
      formatoData: 'DD/MM/YYYY',
      moedaPadrao: 'BRL',
      diaInicioSemana: 1,
      notificacoesPadrao: true,
    });
  });

  it('mescla valor já salvo em configuracoes.geral por cima do default', async () => {
    const prisma = buildPrisma({
      fusoHorario: 'America/Sao_Paulo',
      idioma: 'pt-BR',
      configuracoes: { geral: { moedaPadrao: 'USD' } },
    });
    const result = await new GetGeneralSettingsUseCase(prisma as never).execute('escritorio-1');
    expect(result.moedaPadrao).toBe('USD');
  });

  it('update grava fusoHorario/idioma como coluna e o resto dentro de configuracoes.geral', async () => {
    const prisma = buildPrisma({
      fusoHorario: 'America/Sao_Paulo',
      idioma: 'pt-BR',
      configuracoes: {},
    });
    await new UpdateGeneralSettingsUseCase(prisma as never).execute('escritorio-1', {
      fusoHorario: 'America/Recife',
      moedaPadrao: 'USD',
    });
    expect(prisma.client.escritorio.update).toHaveBeenCalledWith({
      where: { id: 'escritorio-1' },
      data: {
        fusoHorario: 'America/Recife',
        idioma: undefined,
        configuracoes: { geral: expect.objectContaining({ moedaPadrao: 'USD' }) },
      },
    });
  });
});

describe('GetFinancialSettingsUseCase / UpdateFinancialSettingsUseCase', () => {
  it('nega sem financeiro:read', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const result = await new GetFinancialSettingsUseCase(prisma as never).execute(
      'escritorio-1',
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('retorna defaults com financeiro:read', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const result = await new GetFinancialSettingsUseCase(prisma as never).execute('escritorio-1', [
      'financeiro:read',
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.diasVencimentoPadrao).toBe(30);
  });

  it('update nega sem financeiro:read e não grava nada', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const result = await new UpdateFinancialSettingsUseCase(prisma as never).execute(
      'escritorio-1',
      { diasVencimentoPadrao: 45 },
      [],
    );
    expect(result.ok).toBe(false);
    expect(prisma.client.escritorio.update).not.toHaveBeenCalled();
  });

  it('update grava com financeiro:read', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const result = await new UpdateFinancialSettingsUseCase(prisma as never).execute(
      'escritorio-1',
      { diasVencimentoPadrao: 45 },
      ['financeiro:read'],
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.diasVencimentoPadrao).toBe(45);
  });
});

describe('GetAiSettingsUseCase / UpdateAiSettingsUseCase', () => {
  function buildRegistry() {
    return {
      listNames: jest.fn().mockReturnValue(['fake', 'openai', 'anthropic', 'gemini', 'ollama']),
    };
  }

  it('inclui providersDisponiveis do registry', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const registry = buildRegistry();
    const result = await new GetAiSettingsUseCase(prisma as never, registry as never).execute(
      'escritorio-1',
    );
    expect(result.providersDisponiveis).toHaveLength(5);
    expect(result.providerPadrao).toBe('fake');
  });

  it('update mescla cotaMensalPersonalizada por cima do default', async () => {
    const prisma = buildPrisma({ configuracoes: {} });
    const result = await new UpdateAiSettingsUseCase(prisma as never).execute('escritorio-1', {
      cotaMensalPersonalizada: 50,
    });
    expect(result.cotaMensalPersonalizada).toBe(50);
    expect(prisma.client.escritorio.update).toHaveBeenCalledWith({
      where: { id: 'escritorio-1' },
      data: { configuracoes: { ia: expect.objectContaining({ cotaMensalPersonalizada: 50 }) } },
    });
  });
});
