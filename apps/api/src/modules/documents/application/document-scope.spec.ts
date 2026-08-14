import {
  applyDocumentConfidentialityFilter,
  assertDocumentAccess,
  buildDocumentScopeWhere,
  resolveDocumentReadScope,
} from './document-scope';

describe('resolveDocumentReadScope', () => {
  it('resolve ALL > ASSIGNED (o mais amplo vence)', () => {
    expect(resolveDocumentReadScope(['document:read:all', 'document:read:assigned'])).toBe('ALL');
    expect(resolveDocumentReadScope(['document:read:assigned'])).toBe('ASSIGNED');
    expect(resolveDocumentReadScope([])).toBeNull();
  });
});

describe('applyDocumentConfidentialityFilter', () => {
  it('exclui CONFIDENCIAL sem case:read:confidential', () => {
    expect(applyDocumentConfidentialityFilter([])).toEqual({
      confidencialidade: { not: 'CONFIDENCIAL' },
    });
  });

  it('não filtra quando o usuário tem case:read:confidential', () => {
    expect(applyDocumentConfidentialityFilter(['case:read:confidential'])).toEqual({});
  });
});

describe('buildDocumentScopeWhere', () => {
  const actor = { membroId: 'membro-1', teamMemberIds: [] };

  it('combina as duas metades (processo vinculado + documento solto) com OR', () => {
    const where = buildDocumentScopeWhere('ALL', 'ASSIGNED', actor);
    expect(where).toHaveProperty('OR');
  });

  it('retorna where impossível quando nenhum escopo é resolvido (defesa em profundidade)', () => {
    const where = buildDocumentScopeWhere(null, null, actor);
    expect(where).toEqual({ id: '00000000-0000-0000-0000-000000000000' });
  });
});

describe('assertDocumentAccess', () => {
  function buildPrisma(overrides: Record<string, unknown> = {}) {
    return {
      client: {
        processoMembro: { findFirst: jest.fn().mockResolvedValue(null) },
        processo: { findFirst: jest.fn().mockResolvedValue(null) },
        membro: { findFirst: jest.fn().mockResolvedValue(null) },
        ...overrides,
      },
    };
  }

  it('bloqueia CONFIDENCIAL sem case:read:confidential mesmo com document:read:all', async () => {
    const prisma = buildPrisma();
    const acesso = await assertDocumentAccess(
      prisma as never,
      { processoId: null, autorUploadId: 'membro-2', confidencialidade: 'CONFIDENCIAL' },
      { membroId: 'membro-1', permissions: ['document:read:all'] } as never,
    );
    expect(acesso).toBe(false);
  });

  it('documento solto (sem processo) só é acessível pelo próprio autor sem escopo ALL', async () => {
    const prisma = buildPrisma();
    const acessoAutor = await assertDocumentAccess(
      prisma as never,
      { processoId: null, autorUploadId: 'membro-1', confidencialidade: 'PADRAO' },
      { membroId: 'membro-1', permissions: ['document:read:assigned'] } as never,
    );
    expect(acessoAutor).toBe(true);

    const acessoOutro = await assertDocumentAccess(
      prisma as never,
      { processoId: null, autorUploadId: 'membro-2', confidencialidade: 'PADRAO' },
      { membroId: 'membro-1', permissions: ['document:read:assigned'] } as never,
    );
    expect(acessoOutro).toBe(false);
  });

  it('sem nenhuma permissão de leitura, acesso é negado', async () => {
    const prisma = buildPrisma();
    const acesso = await assertDocumentAccess(
      prisma as never,
      { processoId: null, autorUploadId: 'membro-1', confidencialidade: 'PADRAO' },
      { membroId: 'membro-1', permissions: [] } as never,
    );
    expect(acesso).toBe(false);
  });

  it('documento vinculado a processo com case:read:all sempre concede acesso', async () => {
    const prisma = buildPrisma();
    const acesso = await assertDocumentAccess(
      prisma as never,
      { processoId: 'processo-1', autorUploadId: 'membro-2', confidencialidade: 'PADRAO' },
      { membroId: 'membro-1', permissions: ['case:read:all'] } as never,
    );
    expect(acesso).toBe(true);
  });
});
