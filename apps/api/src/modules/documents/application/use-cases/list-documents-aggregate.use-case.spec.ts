import { ListDocumentsAggregateUseCase } from './list-documents-aggregate.use-case';

const userAll = {
  membroId: 'membro-1',
  permissions: ['document:read:all', 'case:read:all'],
} as never;

function buildPrisma(documentos: unknown[] = []) {
  return {
    client: {
      documento: {
        findMany: jest.fn().mockResolvedValue(documentos),
        count: jest.fn().mockResolvedValue(documentos.length),
      },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
      cliente: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('ListDocumentsAggregateUseCase', () => {
  it('filtra vínculo contextual de Pasta Jurídica, valida acesso e retorna total real', async () => {
    const prisma = buildPrisma([]);
    const legalFolders = { get: jest.fn().mockResolvedValue({ id: 'folder-1' }) };
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, legalFolders as never);

    const result = await useCase.execute('escritorio-1', userAll, {
      visao: 'todos',
      sort: '-atualizadoEm',
      limit: 10,
      page: 1,
      resourceType: 'PASTA_JURIDICA',
      resourceId: 'folder-1',
    } as never);

    expect(legalFolders.get).toHaveBeenCalledWith(userAll, 'folder-1');
    expect(prisma.client.documento.findMany.mock.calls[0][0].where.vinculos).toEqual({
      some: { escritorioId: 'escritorio-1', tipoRecurso: 'PASTA_JURIDICA', recursoId: 'folder-1' },
    });
    expect(result.total).toBe(0);
  });

  it('aplica paginação e ordenação por criação no banco, nunca na página carregada', async () => {
    const prisma = buildPrisma([]);
    const useCase = new ListDocumentsAggregateUseCase(
      prisma as never,
      { get: jest.fn().mockResolvedValue({ id: 'folder-1' }) } as never,
    );

    await useCase.execute('escritorio-1', userAll, {
      visao: 'todos',
      sort: '-criadoEm',
      limit: 10,
      page: 3,
      resourceType: 'PASTA_JURIDICA',
      resourceId: 'folder-1',
    } as never);

    expect(prisma.client.documento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { criadoEm: 'desc' }, skip: 20, take: 11 }),
    );
  });

  it('visão "compartilhados" nunca consulta o banco — placeholder honesto com disponivel:false', async () => {
    const prisma = buildPrisma();
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, { get: jest.fn() } as never);

    const result = await useCase.execute('escritorio-1', userAll, {
      visao: 'compartilhados',
      sort: '-atualizadoEm',
      limit: 30,
    } as never);

    expect(result).toEqual({ items: [], nextCursor: null, total: 0, disponivel: false });
    expect(prisma.client.documento.findMany).not.toHaveBeenCalled();
  });

  it('visão "lixeira" filtra excluidoEm no nível raiz do where — reafirma a correção de INCLUDE_DELETED', async () => {
    const prisma = buildPrisma([]);
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, { get: jest.fn() } as never);

    await useCase.execute('escritorio-1', userAll, {
      visao: 'lixeira',
      sort: '-atualizadoEm',
      limit: 30,
    } as never);

    const chamada = prisma.client.documento.findMany.mock.calls[0][0];
    // A chave precisa estar no nível raiz (não dentro de AND) para a
    // extensão de soft-delete reconhecer via `in` e não reinjetar
    // `excluidoEm: null` por cima — verificado diretamente aqui porque um
    // erro de posicionamento zeraria silenciosamente todo resultado de
    // lixeira em produção sem nenhum teste de unidade acusar.
    expect(chamada.where).toHaveProperty('excluidoEm', { not: null });
    expect(chamada.where.AND).toBeDefined();
  });

  it('visão "favoritos" filtra por favoritos.some.membroId do usuário atual', async () => {
    const prisma = buildPrisma([]);
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, { get: jest.fn() } as never);

    await useCase.execute('escritorio-1', userAll, {
      visao: 'favoritos',
      sort: '-atualizadoEm',
      limit: 30,
    } as never);

    const chamada = prisma.client.documento.findMany.mock.calls[0][0];
    expect(chamada.where.favoritos).toEqual({ some: { membroId: 'membro-1' } });
  });

  it('visão "versionados" filtra documentos com pelo menos uma versão além da v1', async () => {
    const prisma = buildPrisma([]);
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, { get: jest.fn() } as never);

    await useCase.execute('escritorio-1', userAll, {
      visao: 'versionados',
      sort: '-atualizadoEm',
      limit: 30,
    } as never);

    const chamada = prisma.client.documento.findMany.mock.calls[0][0];
    expect(chamada.where.versoes).toEqual({ some: { numero: { gt: 1 } } });
  });

  it('resolve paginação por cursor (hasMore/nextCursor) igual ao padrão de ListDeadlinesAggregateUseCase', async () => {
    const documentos = Array.from({ length: 31 }, (_, i) => ({
      id: `doc-${i}`,
      nome: `Doc ${i}`,
      extensao: 'pdf',
      mimeType: 'application/pdf',
      tamanhoBytes: BigInt(10),
      tipo: 'OUTRO',
      categoria: null,
      confidencialidade: 'PADRAO',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versao: 1,
      pasta: null,
      processo: null,
      clienteId: null,
      autorUploadId: 'membro-1',
      tags: [],
      favoritos: [],
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      excluidoEm: null,
      _count: { versoes: 1 },
    }));
    const prisma = buildPrisma(documentos);
    const useCase = new ListDocumentsAggregateUseCase(prisma as never, { get: jest.fn() } as never);

    const result = await useCase.execute('escritorio-1', userAll, {
      visao: 'todos',
      sort: '-atualizadoEm',
      limit: 30,
    } as never);

    expect(result.items).toHaveLength(30);
    expect(result.nextCursor).toBe('doc-29');
  });
});
