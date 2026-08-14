import {
  ConfirmDocumentUploadUseCase,
  ConfirmDocumentVersionUseCase,
  PresignDocumentUploadUseCase,
  PresignDocumentVersionUseCase,
} from './document-upload.use-cases';
import { DocumentVersionTokenService } from '../document-version-token';

describe('PresignDocumentUploadUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      pasta: { findFirst: jest.fn() },
      documento: { create: jest.fn(), update: jest.fn() },
      documentoVinculo: { create: jest.fn() },
    },
  };
  const storage = { presignUpload: jest.fn() };

  function buildUseCase() {
    return new PresignDocumentUploadUseCase(
      prisma as never,
      storage as never,
      { get: jest.fn() } as never,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejeita arquivo acima de 100MB (FILE_TOO_LARGE)', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      {
        nomeArquivo: 'grande.zip',
        mimeType: 'application/zip',
        tamanhoBytes: 200 * 1024 * 1024,
        tipo: 'OUTRO',
      },
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FILE_TOO_LARGE');
    expect(prisma.client.documento.create).not.toHaveBeenCalled();
  });

  it('rejeita mimetype executável (MIME_NOT_ALLOWED)', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      {
        nomeArquivo: 'virus.exe',
        mimeType: 'application/x-msdownload',
        tamanhoBytes: 1024,
        tipo: 'OUTRO',
      },
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MIME_NOT_ALLOWED');
  });

  it('cria o Documento pendente e devolve a URL assinada de upload', async () => {
    prisma.client.documento.create.mockResolvedValue({ id: 'doc-1' });
    storage.presignUpload.mockResolvedValue({ url: 'https://storage/x', expiraEm: new Date() });

    const result = await buildUseCase().execute(
      'escritorio-1',
      {
        nomeArquivo: 'contrato.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: 2048,
        tipo: 'CONTRATO',
      },
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusUpload: 'PENDENTE', autorUploadId: 'membro-1' }),
      }),
    );
    expect(prisma.client.documento.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc-1' } }),
    );
    if (result.ok) expect(result.value.documentoId).toBe('doc-1');
  });

  it('valida a Pasta no tenant e cria um único vínculo contextual sem usar pastaId documental', async () => {
    prisma.client.documento.create.mockResolvedValue({ id: 'doc-1' });
    storage.presignUpload.mockResolvedValue({ url: 'https://storage/x', expiraEm: new Date() });
    const legalFolders = { get: jest.fn().mockResolvedValue({ id: 'legal-folder-1' }) };
    const useCase = new PresignDocumentUploadUseCase(
      prisma as never,
      storage as never,
      legalFolders as never,
    );
    const user = { membroId: 'membro-1', escritorioId: 'escritorio-1' } as never;

    const result = await useCase.execute(
      'escritorio-1',
      {
        nomeArquivo: 'peticao.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: 2048,
        tipo: 'PETICAO',
        resourceType: 'PASTA_JURIDICA',
        resourceId: 'legal-folder-1',
      },
      'membro-1',
      user,
    );

    expect(result.ok).toBe(true);
    expect(legalFolders.get).toHaveBeenCalledWith(user, 'legal-folder-1');
    expect(prisma.client.documento.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pastaId: undefined }) }),
    );
    expect(prisma.client.documentoVinculo.create).toHaveBeenCalledWith({
      data: {
        escritorioId: 'escritorio-1',
        documentoId: 'doc-1',
        tipoRecurso: 'PASTA_JURIDICA',
        recursoId: 'legal-folder-1',
        criadoPorId: 'membro-1',
      },
    });
  });

  it('não cria documento quando a Pasta contextual não pertence ao tenant acessível', async () => {
    const legalFolders = { get: jest.fn().mockRejectedValue(new Error('NOT_FOUND')) };
    const useCase = new PresignDocumentUploadUseCase(
      prisma as never,
      storage as never,
      legalFolders as never,
    );

    await expect(
      useCase.execute(
        'escritorio-1',
        {
          nomeArquivo: 'peticao.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: 2048,
          tipo: 'PETICAO',
          resourceType: 'PASTA_JURIDICA',
          resourceId: 'folder-outro-tenant',
        },
        'membro-1',
        { escritorioId: 'escritorio-1' } as never,
      ),
    ).rejects.toThrow('NOT_FOUND');
    expect(prisma.client.documento.create).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando processoId informado não existe no escritório', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      {
        nomeArquivo: 'a.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: 10,
        processoId: 'processo-x',
        tipo: 'OUTRO',
      },
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('ConfirmDocumentUploadUseCase', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn(), update: jest.fn() },
      versaoDocumento: { create: jest.fn() },
    },
  };
  const antivirus = { scan: jest.fn() };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new ConfirmDocumentUploadUseCase(prisma as never, antivirus as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejeita confirmar upload que já não está PENDENTE (UPLOAD_NOT_PENDING)', async () => {
    prisma.client.documento.findFirst.mockResolvedValue({ id: 'doc-1', statusUpload: 'CONCLUIDO' });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { hashSha256: 'a'.repeat(64) },
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_NOT_PENDING');
  });

  it('confirma o upload, cria a v1 e registra evento de timeline quando há processo vinculado', async () => {
    prisma.client.documento.findFirst
      .mockResolvedValueOnce({
        id: 'doc-1',
        statusUpload: 'PENDENTE',
        storageKey: 'key-1',
        tamanhoBytes: BigInt(10),
        nome: 'contrato.pdf',
        processoId: 'processo-1',
      })
      .mockResolvedValueOnce(null); // busca de duplicidade por hash
    prisma.client.versaoDocumento.create.mockResolvedValue({ id: 'versao-1' });
    antivirus.scan.mockResolvedValue('LIMPO');

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { hashSha256: 'a'.repeat(64) },
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.documento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusUpload: 'CONCLUIDO', statusAntivirus: 'LIMPO' }),
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'DOCUMENTO', processoId: 'processo-1' }),
    );
  });

  it('não grava evento de timeline quando o documento não tem processo vinculado', async () => {
    prisma.client.documento.findFirst
      .mockResolvedValueOnce({
        id: 'doc-1',
        statusUpload: 'PENDENTE',
        storageKey: 'key-1',
        tamanhoBytes: BigInt(10),
        nome: 'contrato.pdf',
        processoId: null,
      })
      .mockResolvedValueOnce(null);
    prisma.client.versaoDocumento.create.mockResolvedValue({ id: 'versao-1' });
    antivirus.scan.mockResolvedValue('LIMPO');

    await buildUseCase().execute(
      'escritorio-1',
      'doc-1',
      { hashSha256: 'a'.repeat(64) },
      'membro-1',
    );

    expect(timeline.record).not.toHaveBeenCalled();
  });

  it('sinaliza aviso de duplicidade não bloqueante quando já existe o mesmo hash', async () => {
    prisma.client.documento.findFirst
      .mockResolvedValueOnce({
        id: 'doc-2',
        statusUpload: 'PENDENTE',
        storageKey: 'key-2',
        tamanhoBytes: BigInt(10),
        nome: 'contrato-copia.pdf',
        processoId: null,
      })
      .mockResolvedValueOnce({ id: 'doc-1', nome: 'contrato.pdf' });
    prisma.client.versaoDocumento.create.mockResolvedValue({ id: 'versao-1' });
    antivirus.scan.mockResolvedValue('LIMPO');

    const result = await buildUseCase().execute(
      'escritorio-1',
      'doc-2',
      { hashSha256: 'b'.repeat(64) },
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.avisoDuplicidade).toEqual({
        documentoExistenteId: 'doc-1',
        nome: 'contrato.pdf',
      });
    }
  });
});

describe('fluxo de nova versão (presign + confirm com token assinado)', () => {
  const prisma = {
    client: {
      documento: { findFirst: jest.fn(), update: jest.fn() },
      versaoDocumento: { create: jest.fn() },
    },
  };
  const storage = { presignUpload: jest.fn(), exists: jest.fn() };
  const antivirus = { scan: jest.fn() };
  const timeline = { record: jest.fn() };
  const versionTokens = new DocumentVersionTokenService();

  beforeEach(() => jest.clearAllMocks());

  it('presign calcula o próximo número de versão e o confirm usa o token assinado (sem o cliente enviar storageKey)', async () => {
    prisma.client.documento.findFirst.mockResolvedValueOnce({
      id: 'doc-1',
      versoes: [{ numero: 2 }],
    });
    storage.presignUpload.mockResolvedValue({ url: 'https://storage/v3', expiraEm: new Date() });

    const presignUseCase = new PresignDocumentVersionUseCase(
      prisma as never,
      storage as never,
      versionTokens,
    );
    const presignResult = await presignUseCase.execute('escritorio-1', 'doc-1', {
      nomeArquivo: 'v3.pdf',
      mimeType: 'application/pdf',
      tamanhoBytes: 4096,
    });

    expect(presignResult.ok).toBe(true);
    if (!presignResult.ok) return;
    expect(presignResult.value.proximoNumero).toBe(3);

    prisma.client.documento.findFirst.mockResolvedValueOnce({
      id: 'doc-1',
      nome: 'contrato.pdf',
      processoId: 'processo-1',
    });
    storage.exists.mockResolvedValue(true);
    prisma.client.versaoDocumento.create.mockResolvedValue({ id: 'versao-3', numero: 3 });
    antivirus.scan.mockResolvedValue('LIMPO');

    const confirmUseCase = new ConfirmDocumentVersionUseCase(
      prisma as never,
      antivirus as never,
      storage as never,
      timeline as never,
      versionTokens,
    );
    const confirmResult = await confirmUseCase.execute(
      'escritorio-1',
      'doc-1',
      { versionToken: presignResult.value.versionToken, hashSha256: 'c'.repeat(64) },
      'membro-1',
    );

    expect(confirmResult.ok).toBe(true);
    if (confirmResult.ok) expect(confirmResult.value.numero).toBe(3);
    expect(prisma.client.versaoDocumento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ numero: 3, tamanhoBytes: BigInt(4096) }),
      }),
    );
  });

  it('rejeita confirmar versão com token de outro documento (UPLOAD_EXPIRED)', async () => {
    prisma.client.documento.findFirst.mockResolvedValueOnce({
      id: 'doc-2',
      nome: 'x',
      processoId: null,
    });
    const tokenDeOutroDocumento = versionTokens.sign({
      documentoId: 'doc-999',
      numero: 1,
      storageKey: 'k',
      tamanhoBytes: 1,
      exp: Date.now() + 60_000,
    });

    const confirmUseCase = new ConfirmDocumentVersionUseCase(
      prisma as never,
      antivirus as never,
      storage as never,
      timeline as never,
      versionTokens,
    );
    const result = await confirmUseCase.execute(
      'escritorio-1',
      'doc-2',
      { versionToken: tokenDeOutroDocumento, hashSha256: 'd'.repeat(64) },
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPLOAD_EXPIRED');
  });
});
