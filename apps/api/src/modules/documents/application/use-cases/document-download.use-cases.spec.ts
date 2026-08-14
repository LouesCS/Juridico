import {
  DownloadDocumentUseCase,
  DownloadDocumentVersionUseCase,
  PreviewDocumentUseCase,
} from './document-download.use-cases';

const userAll = {
  membroId: 'membro-1',
  permissions: ['document:read:all', 'case:read:all'],
} as never;

function buildPrisma(documento: unknown) {
  return {
    client: {
      documento: { findFirst: jest.fn().mockResolvedValue(documento) },
      processoMembro: { findFirst: jest.fn().mockResolvedValue(null) },
      processo: { findFirst: jest.fn().mockResolvedValue(null) },
      membro: { findFirst: jest.fn().mockResolvedValue(null) },
    },
  };
}

describe('DownloadDocumentUseCase', () => {
  it('bloqueia incondicionalmente download de documento INFECTADO (FILE_INFECTED)', async () => {
    const prisma = buildPrisma({
      id: 'doc-1',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
      statusAntivirus: 'INFECTADO',
      statusUpload: 'CONCLUIDO',
      storageKey: 'key-1',
      nome: 'x.pdf',
    });
    const storage = { presignDownload: jest.fn() };

    const result = await new DownloadDocumentUseCase(prisma as never, storage as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FILE_INFECTED');
    expect(storage.presignDownload).not.toHaveBeenCalled();
  });

  it('gera URL assinada de download (disposition attachment) para documento limpo', async () => {
    const prisma = buildPrisma({
      id: 'doc-1',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
      statusAntivirus: 'LIMPO',
      statusUpload: 'CONCLUIDO',
      storageKey: 'key-1',
      nome: 'x.pdf',
    });
    const storage = {
      presignDownload: jest.fn().mockResolvedValue({ url: 'https://x', expiraEm: new Date() }),
    };

    const result = await new DownloadDocumentUseCase(prisma as never, storage as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(storage.presignDownload).toHaveBeenCalledWith(
      'key-1',
      300,
      expect.objectContaining({ disposition: 'attachment' }),
    );
  });

  it('recusa entrega de documento cujo upload ainda não foi concluído', async () => {
    const prisma = buildPrisma({
      id: 'doc-1',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
      statusAntivirus: 'PENDENTE',
      statusUpload: 'PENDENTE',
      storageKey: '',
      nome: 'x.pdf',
    });
    const storage = { presignDownload: jest.fn() };

    const result = await new DownloadDocumentUseCase(prisma as never, storage as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('PreviewDocumentUseCase', () => {
  it('gera URL assinada com disposition inline', async () => {
    const prisma = buildPrisma({
      id: 'doc-1',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
      statusAntivirus: 'LIMPO',
      statusUpload: 'CONCLUIDO',
      storageKey: 'key-1',
      nome: 'x.pdf',
      mimeType: 'application/pdf',
    });
    const storage = {
      presignDownload: jest.fn().mockResolvedValue({ url: 'https://x', expiraEm: new Date() }),
    };

    const result = await new PreviewDocumentUseCase(prisma as never, storage as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(storage.presignDownload).toHaveBeenCalledWith(
      'key-1',
      300,
      expect.objectContaining({ disposition: 'inline' }),
    );
  });
});

describe('DownloadDocumentVersionUseCase', () => {
  function buildPrismaComVersao(documento: unknown, versao: unknown) {
    const prisma = buildPrisma(documento);
    return {
      client: {
        ...prisma.client,
        versaoDocumento: { findFirst: jest.fn().mockResolvedValue(versao) },
      },
    };
  }

  it('gera URL assinada para a storageKey da versão específica, não a vigente', async () => {
    const prisma = buildPrismaComVersao(
      {
        id: 'doc-1',
        processoId: null,
        autorUploadId: 'membro-1',
        confidencialidade: 'PADRAO',
        statusAntivirus: 'LIMPO',
        nome: 'contrato.pdf',
        storageKey: 'key-vigente',
      },
      { id: 'versao-1', documentoId: 'doc-1', numero: 1, storageKey: 'key-v1' },
    );
    const storage = {
      presignDownload: jest.fn().mockResolvedValue({ url: 'https://x', expiraEm: new Date() }),
    };

    const result = await new DownloadDocumentVersionUseCase(
      prisma as never,
      storage as never,
    ).execute('escritorio-1', 'doc-1', 'versao-1', userAll);

    expect(result.ok).toBe(true);
    expect(storage.presignDownload).toHaveBeenCalledWith(
      'key-v1',
      300,
      expect.objectContaining({ disposition: 'attachment' }),
    );
  });

  it('bloqueia download de versão de documento INFECTADO', async () => {
    const prisma = buildPrismaComVersao(
      {
        id: 'doc-1',
        processoId: null,
        autorUploadId: 'membro-1',
        confidencialidade: 'PADRAO',
        statusAntivirus: 'INFECTADO',
        nome: 'contrato.pdf',
      },
      { id: 'versao-1', documentoId: 'doc-1', numero: 1, storageKey: 'key-v1' },
    );
    const storage = { presignDownload: jest.fn() };

    const result = await new DownloadDocumentVersionUseCase(
      prisma as never,
      storage as never,
    ).execute('escritorio-1', 'doc-1', 'versao-1', userAll);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FILE_INFECTED');
  });

  it('retorna NOT_FOUND quando a versão não pertence ao documento', async () => {
    const prisma = buildPrismaComVersao(
      {
        id: 'doc-1',
        processoId: null,
        autorUploadId: 'membro-1',
        confidencialidade: 'PADRAO',
        statusAntivirus: 'LIMPO',
        nome: 'contrato.pdf',
      },
      null,
    );
    const storage = { presignDownload: jest.fn() };

    const result = await new DownloadDocumentVersionUseCase(
      prisma as never,
      storage as never,
    ).execute('escritorio-1', 'doc-1', 'versao-x', userAll);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
