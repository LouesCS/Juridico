import { UnlinkDocumentUseCase } from './document-link.use-case';

describe('UnlinkDocumentUseCase', () => {
  it('remove somente o vínculo tenant-scoped e preserva o Documento global', async () => {
    const prisma = {
      client: {
        documento: { findFirst: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
        documentoVinculo: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      },
    };
    const legalFolders = { get: jest.fn().mockResolvedValue({ id: 'folder-1' }) };
    const useCase = new UnlinkDocumentUseCase(prisma as never, legalFolders as never);
    const user = { escritorioId: 'office-1', membroId: 'member-1' } as never;

    const result = await useCase.execute('office-1', 'doc-1', 'folder-1', user);

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc-1', escritorioId: 'office-1' },
      select: { id: true },
    });
    expect(legalFolders.get).toHaveBeenCalledWith(user, 'folder-1');
    expect(prisma.client.documentoVinculo.deleteMany).toHaveBeenCalledWith({
      where: {
        escritorioId: 'office-1',
        documentoId: 'doc-1',
        tipoRecurso: 'PASTA_JURIDICA',
        recursoId: 'folder-1',
      },
    });
    expect(prisma.client.documento).not.toHaveProperty('delete');
  });

  it('rejeita documento de outro tenant como inexistente e não tenta desvincular', async () => {
    const prisma = {
      client: {
        documento: { findFirst: jest.fn().mockResolvedValue(null) },
        documentoVinculo: { deleteMany: jest.fn() },
      },
    };
    const useCase = new UnlinkDocumentUseCase(
      prisma as never,
      { get: jest.fn() } as never,
    );

    const result = await useCase.execute('office-1', 'doc-other', 'folder-1', {} as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.documentoVinculo.deleteMany).not.toHaveBeenCalled();
  });
});
