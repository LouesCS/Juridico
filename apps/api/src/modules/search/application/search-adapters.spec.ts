import {
  ClientSearchAdapter,
  CommentSearchAdapter,
  DeadlineSearchAdapter,
  DocumentSearchAdapter,
  FolderSearchAdapter,
  LegalCaseSearchAdapter,
  TagSearchAdapter,
  TeamSearchAdapter,
  TimelineSearchAdapter,
} from './search-adapters';

function buildPrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const defaults = {
    cliente: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    processo: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    documento: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    prazo: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    eventoTimeline: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    membro: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    equipe: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    pasta: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    tag: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
  };
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(defaults[model as keyof typeof defaults], methods);
  }
  return { client: defaults };
}

const baseCtx = { escritorioId: 'escritorio-1', q: 'silva', limit: 8 };

describe('ClientSearchAdapter', () => {
  it('retorna grupo vazio sem client:read', async () => {
    const prisma = buildPrisma();
    const adapter = new ClientSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'clients', total: 0, items: [] });
    expect(prisma.client.cliente.count).not.toHaveBeenCalled();
  });

  it('busca por nome/razão social/cpf/cnpj quando autorizado, mostrando o CPF/CNPJ por completo (sem máscara)', async () => {
    const prisma = buildPrisma({
      cliente: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            nome: 'João Silva',
            razaoSocial: null,
            tipo: 'PESSOA_FISICA',
            cpf: '12345678900',
            cnpj: null,
            emails: [],
            telefones: [],
            status: 'ATIVO',
            atualizadoEm: new Date(),
          },
        ]),
      },
    });
    const adapter = new ClientSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['client:read'] },
    } as never);

    expect(result.total).toBe(1);
    expect(result.items[0].titulo).toBe('João Silva');
    expect(result.items[0].metadata.documento).toBe('12345678900');
  });

  it('continua mostrando o CPF/CNPJ por completo quando o portador também tem client:read:sensitive (permissão sem efeito prático, mas não deve quebrar)', async () => {
    const prisma = buildPrisma({
      cliente: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            nome: 'João Silva',
            razaoSocial: null,
            tipo: 'PESSOA_FISICA',
            cpf: '12345678900',
            cnpj: null,
            emails: [],
            telefones: [],
            status: 'ATIVO',
            atualizadoEm: new Date(),
          },
        ]),
      },
    });
    const adapter = new ClientSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['client:read', 'client:read:sensitive'] },
    } as never);

    expect(result.items[0].metadata.documento).toBe('12345678900');
  });
});

describe('LegalCaseSearchAdapter', () => {
  it('retorna grupo vazio sem case:read:*', async () => {
    const prisma = buildPrisma();
    const adapter = new LegalCaseSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'legal-cases', total: 0, items: [] });
  });

  it('aplica filtro de segredo de justiça quando falta case:read:confidential', async () => {
    const prisma = buildPrisma();
    const adapter = new LegalCaseSearchAdapter(prisma as never);
    await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['case:read:all'] },
    } as never);

    const where = prisma.client.processo.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ segredoJustica: false });
  });
});

describe('DocumentSearchAdapter', () => {
  it('retorna grupo vazio sem permissão de leitura de documento/processo', async () => {
    const prisma = buildPrisma();
    const adapter = new DocumentSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'documents', total: 0, items: [] });
  });

  it('combina escopo (branches) e busca textual sob AND — nunca sobrepõe a chave OR', async () => {
    const prisma = buildPrisma();
    const adapter = new DocumentSearchAdapter(prisma as never);
    await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['case:read:all', 'document:read:all'] },
    } as never);

    const where = prisma.client.documento.findMany.mock.calls[0][0].where;
    // Regressão: se o filtro de escopo e o de texto usassem a mesma chave
    // `OR` num spread solto, um sobreporia o outro silenciosamente e
    // vazaria documentos fora do escopo do usuário.
    expect(Array.isArray(where.AND)).toBe(true);
    expect(where.AND).toHaveLength(3);
    expect(where.AND[2].OR).toEqual(
      expect.arrayContaining([
        { nome: { contains: 'silva', mode: 'insensitive' } },
        { nomeOriginal: { contains: 'silva', mode: 'insensitive' } },
      ]),
    );
  });
});

describe('DeadlineSearchAdapter', () => {
  it('retorna grupo vazio sem escopo de leitura de processo', async () => {
    const prisma = buildPrisma();
    const adapter = new DeadlineSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'deadlines', total: 0, items: [] });
  });

  it('monta url de deep-link para a aba de prazos do processo', async () => {
    const prisma = buildPrisma({
      prazo: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            titulo: 'Contestação',
            descricao: null,
            tipo: 'FATAL',
            status: 'PENDENTE',
            prioridade: 'ALTA',
            dataVencimento: new Date(),
            atualizadoEm: new Date(),
            processo: { id: 'proc-1', titulo: 'Ação X' },
          },
        ]),
      },
    });
    const adapter = new DeadlineSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['case:read:all'] },
    } as never);
    expect(result.items[0].url).toBe('/processos/proc-1?tab=prazos');
  });
});

describe('TimelineSearchAdapter', () => {
  it('retorna grupo vazio sem escopo de leitura de processo', async () => {
    const prisma = buildPrisma();
    const adapter = new TimelineSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'timeline', total: 0, items: [] });
  });
});

describe('TeamSearchAdapter', () => {
  it('retorna grupo vazio sem member:read', async () => {
    const prisma = buildPrisma();
    const adapter = new TeamSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'team', total: 0, items: [] });
  });

  it('consolida membros e equipes num único grupo ranqueado', async () => {
    const prisma = buildPrisma({
      membro: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            cargo: null,
            usuario: { nome: 'Silva', sobrenome: 'Souza', email: 'silva@x.com', avatarUrl: null },
            papel: { nome: 'ADVOGADO' },
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      equipe: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'e1', nome: 'Equipe Silva' }]),
      },
    });
    const adapter = new TeamSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: ['member:read'] },
    } as never);

    expect(result.total).toBe(2);
    expect(result.items.map((i) => i.metadata.subtipo).sort()).toEqual(['equipe', 'membro']);
  });
});

describe('FolderSearchAdapter', () => {
  it('retorna grupo vazio sem escopo algum', async () => {
    const prisma = buildPrisma();
    const adapter = new FolderSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'folders', total: 0, items: [] });
  });
});

describe('TagSearchAdapter', () => {
  it('retorna grupo vazio sem escopo de leitura de documento', async () => {
    const prisma = buildPrisma();
    const adapter = new TagSearchAdapter(prisma as never);
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'tags', total: 0, items: [] });
  });
});

describe('CommentSearchAdapter', () => {
  it('sempre devolve disponivel:false — módulo Comments não existe', async () => {
    const adapter = new CommentSearchAdapter();
    const result = await adapter.search({
      ...baseCtx,
      user: { membroId: 'm1', permissions: [] },
    } as never);
    expect(result).toEqual({ type: 'comments', total: 0, items: [], disponivel: false });
  });
});
