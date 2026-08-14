import { GetDocumentUseCase } from './get-document.use-case';

const userAll = {
  membroId: 'membro-1',
  permissions: ['document:read:all', 'case:read:all'],
} as never;

function buildDocumentoBase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    nome: 'contrato.pdf',
    nomeOriginal: 'contrato.pdf',
    extensao: 'pdf',
    mimeType: 'application/pdf',
    tamanhoBytes: BigInt(2048),
    tipo: 'CONTRATO',
    categoria: null,
    descricao: null,
    confidencialidade: 'PADRAO',
    visibilidade: 'INTERNA',
    statusUpload: 'CONCLUIDO',
    statusProcessamento: 'PRONTO',
    statusAntivirus: 'LIMPO',
    versao: 1,
    dataDocumento: null,
    pasta: null,
    processo: null,
    clienteId: null,
    autorUploadId: 'membro-1',
    versoes: [],
    tags: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    excluidoEm: null,
    ...overrides,
  };
}

describe('GetDocumentUseCase', () => {
  function buildPrisma(documento: unknown) {
    return {
      client: {
        documento: { findFirst: jest.fn().mockResolvedValue(documento) },
        membro: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'membro-1', usuario: { nome: 'Ana', avatarUrl: null } }),
        },
        documentoFavorito: { findUnique: jest.fn().mockResolvedValue(null) },
        cliente: { findFirst: jest.fn().mockResolvedValue(null) },
        processoMembro: { findFirst: jest.fn().mockResolvedValue(null) },
        processo: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    };
  }

  it('retorna NOT_FOUND quando o documento não existe no escritório', async () => {
    const prisma = buildPrisma(null);
    const result = await new GetDocumentUseCase(prisma as never).execute(
      'escritorio-1',
      'doc-x',
      userAll,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND (nunca FORBIDDEN) quando o usuário não tem acesso ao documento confidencial', async () => {
    const prisma = buildPrisma(buildDocumentoBase({ confidencialidade: 'CONFIDENCIAL' }));
    const userSemConfidencial = {
      membroId: 'membro-1',
      permissions: ['document:read:all'],
    } as never;

    const result = await new GetDocumentUseCase(prisma as never).execute(
      'escritorio-1',
      'doc-1',
      userSemConfidencial,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna o documento com tamanhoBytes serializado como string (BigInt não é serializável em JSON)', async () => {
    const prisma = buildPrisma(buildDocumentoBase());

    const result = await new GetDocumentUseCase(prisma as never).execute(
      'escritorio-1',
      'doc-1',
      userAll,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tamanhoBytes).toBe('2048');
      expect(typeof result.value.tamanhoBytes).toBe('string');
    }
  });
});
