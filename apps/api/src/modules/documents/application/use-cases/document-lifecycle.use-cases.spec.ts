import {
  DeleteDocumentUseCase,
  DuplicateDocumentUseCase,
  MoveDocumentUseCase,
  RestoreDocumentUseCase,
  ToggleDocumentFavoriteUseCase,
} from './document-lifecycle.use-cases';

// `case:read:all` cobre documentos vinculados a processo; `document:read:all`
// cobre documentos soltos (biblioteca geral) — reafirma docs/api/03-autorizacao.md
// §3.7 ("documento herda o escopo do processo ao qual está vinculado").
const userAll = {
  membroId: 'membro-1',
  permissions: ['document:read:all', 'case:read:all'],
} as never;

describe('MoveDocumentUseCase', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn(), update: jest.fn() },
      pasta: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      processoMembro: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new MoveDocumentUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('move para outra pasta e registra evento quando há processo', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'contrato.pdf',
      processoId: 'processo-1',
      autorUploadId: 'membro-2',
      confidencialidade: 'PADRAO',
    });
    prisma.client.pasta.findFirst.mockResolvedValue({ id: 'pasta-2' });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { pastaId: 'pasta-2' },
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { pastaId: 'pasta-2', processoId: undefined },
    });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ processoId: 'processo-1' }),
    );
  });

  it('move para "sem pasta" explicitamente com pastaId: null', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'contrato.pdf',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { pastaId: null },
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { pastaId: null, processoId: undefined },
    });
  });

  it('retorna NOT_FOUND quando a pasta de destino não existe', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
    });
    prisma.client.pasta.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { pastaId: 'pasta-x' },
      userAll,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('DeleteDocumentUseCase / RestoreDocumentUseCase', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn(), delete: jest.fn(), update: jest.fn() },
      processoMembro: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('exclui logicamente (soft delete) e registra evento', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'x.pdf',
      processoId: 'processo-1',
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
    });

    const result = await new DeleteDocumentUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: expect.stringContaining('excluído') }),
    );
  });

  it('restaura documento (o findFirst deve usar o escape hatch de soft-delete)', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'x.pdf',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
    });

    const result = await new RestoreDocumentUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ excluidoEm: undefined }) }),
    );
    expect(prisma.client.documento.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { excluidoEm: null },
    });
  });
});

describe('DuplicateDocumentUseCase', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      versaoDocumento: { create: jest.fn() },
      processoMembro: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('cria uma cópia reaproveitando a storageKey (versão imutável, nunca reescrita)', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'contrato.pdf',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
      nomeOriginal: 'contrato.pdf',
      extensao: 'pdf',
      mimeType: 'application/pdf',
      tamanhoBytes: BigInt(100),
      storageKey: 'key-original',
      hashSha256: 'a'.repeat(64),
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      categoria: null,
      tipo: 'CONTRATO',
      visibilidade: 'INTERNA',
      descricao: null,
      dataDocumento: null,
      clienteId: null,
      pastaId: null,
    });
    prisma.client.documento.create.mockResolvedValue({
      id: 'doc-2',
      nome: 'contrato.pdf (cópia)',
      processoId: null,
    });
    prisma.client.versaoDocumento.create.mockResolvedValue({ id: 'versao-2' });

    const result = await new DuplicateDocumentUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.versaoDocumento.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storageKey: 'key-original' }) }),
    );
  });
});

describe('ToggleDocumentFavoriteUseCase', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn() },
      documentoFavorito: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      processoMembro: { findFirst: jest.fn() },
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('alterna favorito (favorita e depois desfavorita)', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({
      id: 'doc-1',
      nome: 'x.pdf',
      processoId: null,
      autorUploadId: 'membro-1',
      confidencialidade: 'PADRAO',
    });
    prisma.client.documentoFavorito.findUnique.mockResolvedValueOnce(null);

    const useCase = new ToggleDocumentFavoriteUseCase(prisma as never, timeline as never);
    const primeiro = await useCase.execute('escritorio-1', 'doc-1', userAll);
    expect(primeiro.ok).toBe(true);
    if (primeiro.ok) expect(primeiro.value.favorito).toBe(true);

    prisma.client.documentoFavorito.findUnique.mockResolvedValueOnce({
      documentoId: 'doc-1',
      membroId: 'membro-1',
    });
    const segundo = await useCase.execute('escritorio-1', 'doc-1', userAll);
    expect(segundo.ok).toBe(true);
    if (segundo.ok) expect(segundo.value.favorito).toBe(false);
  });
});
