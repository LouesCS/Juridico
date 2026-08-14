import { ListLegalCasesUseCase } from './list-legal-cases.use-case';

function buildUser(permissions: string[] = ['case:read:all']) {
  return {
    usuarioId: 'usuario-1',
    membroId: 'membro-1',
    escritorioId: 'escritorio-1',
    sessionId: 'sessao-1',
    roles: [],
    permissions,
  };
}

describe('ListLegalCasesUseCase', () => {
  const prisma = {
    client: {
      processo: { findMany: jest.fn(), count: jest.fn() },
      membro: { findFirst: jest.fn(), findMany: jest.fn() },
      prazo: { findMany: jest.fn() },
      parteProcesso: { findMany: jest.fn() },
    },
  };

  function buildUseCase() {
    return new ListLegalCasesUseCase(prisma as never);
  }

  const baseQuery = { meusApenas: false, sort: '-ultimaAtualizacaoEm' as const, limit: 20 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.membro.findFirst.mockResolvedValue({ equipeId: null });
    prisma.client.membro.findMany.mockResolvedValue([]);
    prisma.client.processo.count.mockResolvedValue(1);
  });

  it('calcula proximaDataRelevante a partir do prazo pendente mais próximo (não lê a coluna nunca escrita)', async () => {
    prisma.client.processo.findMany.mockResolvedValue([
      {
        id: 'processo-1',
        titulo: 'Ação de cobrança',
        numeroCnj: null,
        status: 'ATIVO',
        prioridade: 'MEDIA',
        area: 'Cível',
        tribunal: null,
        comarca: null,
        segredoJustica: false,
        clienteId: 'cliente-1',
        cliente: { nome: 'João da Silva' },
        responsavelPrincipalId: 'membro-1',
        proximaDataRelevante: null,
        ultimaAtualizacaoEm: new Date(),
        versao: 1,
      },
    ]);
    prisma.client.prazo.findMany.mockResolvedValue([
      { processoId: 'processo-1', dataVencimento: new Date('2026-08-10T00:00:00.000Z') },
      { processoId: 'processo-1', dataVencimento: new Date('2026-08-20T00:00:00.000Z') },
    ]);

    const result = await buildUseCase().execute('escritorio-1', buildUser(), baseQuery);

    expect(result.items[0].proximaDataRelevante).toEqual(new Date('2026-08-10T00:00:00.000Z'));
    expect(prisma.client.prazo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { processoId: { in: ['processo-1'] }, status: 'PENDENTE' },
      }),
    );
  });

  it('retorna null quando o processo não tem nenhum prazo pendente', async () => {
    prisma.client.processo.findMany.mockResolvedValue([
      {
        id: 'processo-1',
        titulo: 'Ação de cobrança',
        numeroCnj: null,
        status: 'ATIVO',
        prioridade: 'MEDIA',
        area: 'Cível',
        tribunal: null,
        comarca: null,
        segredoJustica: false,
        clienteId: 'cliente-1',
        cliente: { nome: 'João da Silva' },
        responsavelPrincipalId: 'membro-1',
        proximaDataRelevante: null,
        ultimaAtualizacaoEm: new Date(),
        versao: 1,
      },
    ]);
    prisma.client.prazo.findMany.mockResolvedValue([]);

    const result = await buildUseCase().execute('escritorio-1', buildUser(), baseQuery);

    expect(result.items[0].proximaDataRelevante).toBeNull();
  });

  it('filtra a visão global por tipo Judicial e retorna total real', async () => {
    prisma.client.processo.findMany.mockResolvedValue([]);
    prisma.client.processo.count.mockResolvedValue(7);
    prisma.client.prazo.findMany.mockResolvedValue([]);
    const result = await buildUseCase().execute('escritorio-1', buildUser(), {
      ...baseQuery,
      tipo: 'JUDICIAL',
    });
    expect(prisma.client.processo.findMany.mock.calls[0][0].where.tipo).toBe('JUDICIAL');
    expect(result.total).toBe(7);
  });
  it('combina filtros extrajudiciais no banco e usa NOT EXISTS para movimentações após o corte', async () => {
    prisma.client.processo.findMany.mockResolvedValue([]);
    prisma.client.processo.count.mockResolvedValue(0);
    prisma.client.prazo.findMany.mockResolvedValue([]);
    await buildUseCase().execute('escritorio-1', buildUser(), {
      ...baseQuery,
      tipo: 'EXTRAJUDICIAL',
      protocolo: '700',
      parteId: 'parte-1',
      parteContrariaId: 'reu-1',
      pastaJuridicaId: 'pasta-1',
      encarregadoId: 'membro-2',
      clienteId: 'cliente-1',
      semMovimentacoesApos: '2026-07-01',
    } as never);
    const where = prisma.client.processo.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        escritorioId: 'escritorio-1',
        tipo: 'EXTRAJUDICIAL',
        clienteId: 'cliente-1',
        numeroInterno: { contains: '700', mode: 'insensitive' },
        movimentacoesExtrajudiciais: {
          none: {
            excluidoEm: null,
            dataMovimentacao: { gt: new Date('2026-07-01T23:59:59.999Z') },
          },
        },
      }),
    );
  });

  it('nunca escolhe arbitrariamente o principal: filtra partes por principal=true e ignora excluídas', async () => {
    prisma.client.processo.findMany.mockResolvedValue([
      {
        id: 'processo-1',
        titulo: 'Ação previdenciária',
        numeroCnj: null,
        status: 'ATIVO',
        prioridade: 'MEDIA',
        area: 'Previdenciário',
        tribunal: null,
        comarca: null,
        segredoJustica: false,
        clienteId: 'cliente-1',
        cliente: { nome: 'João da Silva' },
        responsavelPrincipalId: 'membro-1',
        proximaDataRelevante: null,
        ultimaAtualizacaoEm: new Date(),
        versao: 1,
        partes: [
          { id: 'parte-1', tipo: 'AUTOR', nome: 'João da Silva', clienteId: 'cliente-1' },
          {
            id: 'parte-2',
            tipo: 'ADVOGADO_AUTOR',
            nome: 'Dra. Ana',
            clienteId: null,
          },
        ],
      },
    ]);
    prisma.client.prazo.findMany.mockResolvedValue([]);

    const result = await buildUseCase().execute('escritorio-1', buildUser(), baseQuery);

    expect(prisma.client.processo.findMany.mock.calls[0][0].include.partes).toEqual(
      expect.objectContaining({
        where: {
          tipo: { in: ['AUTOR', 'REU', 'ADVOGADO_AUTOR', 'ADVOGADO_REU'] },
          principal: true,
          excluidoEm: null,
        },
      }),
    );
    expect(result.items[0].autorPrincipal).toEqual(
      expect.objectContaining({ id: 'parte-1', tipo: 'AUTOR' }),
    );
    expect(result.items[0].advogadoPrincipalAutor).toEqual(
      expect.objectContaining({ id: 'parte-2', tipo: 'ADVOGADO_AUTOR' }),
    );
    expect(result.items[0].reuPrincipal).toBeNull();
    expect(result.items[0].advogadoPrincipalReu).toBeNull();
  });

  it('lista opções de Parte somente no tenant e no escopo acessível', async () => {
    prisma.client.parteProcesso.findMany.mockResolvedValue([]);
    await buildUseCase().listPartyOptions('escritorio-1', buildUser(), {
      q: 'João',
      tipo: 'TODAS',
      limit: 25,
    });
    expect(prisma.client.parteProcesso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'escritorio-1',
          excluidoEm: null,
          processo: expect.objectContaining({ tipo: 'EXTRAJUDICIAL' }),
        }),
        take: 26,
      }),
    );
  });
});
