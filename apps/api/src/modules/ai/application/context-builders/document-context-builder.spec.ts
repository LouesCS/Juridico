import { DocumentContextBuilder } from './document-context-builder';

describe('DocumentContextBuilder', () => {
  it('retorna NOT_FOUND quando o documento não existe', async () => {
    const prisma = { client: { documento: { findFirst: jest.fn().mockResolvedValue(null) } } };
    const builder = new DocumentContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'doc-1', {
      membroId: 'm1',
      permissions: [],
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('retorna NOT_FOUND quando o usuário não tem acesso ao documento (sem escopo)', async () => {
    const prisma = {
      client: {
        documento: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc-1',
            processoId: null,
            autorUploadId: 'outro-membro',
            confidencialidade: 'PADRAO',
            nome: 'Contrato.pdf',
            processo: null,
            tags: [],
          }),
        },
        membro: { findFirst: jest.fn().mockResolvedValue(null) },
        processo: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    };
    const builder = new DocumentContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'doc-1', {
      membroId: 'm1',
      permissions: ['document:read:assigned'],
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('deixa explícito no contexto que o conteúdo do arquivo não foi analisado (só metadados)', async () => {
    const prisma = {
      client: {
        documento: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'doc-1',
            processoId: null,
            clienteId: null,
            autorUploadId: 'm1',
            confidencialidade: 'PADRAO',
            nome: 'Contrato.pdf',
            tipo: 'CONTRATO',
            categoria: null,
            extensao: 'pdf',
            versao: 1,
            dataDocumento: null,
            atualizadoEm: new Date(),
            processo: null,
            tags: [],
          }),
        },
      },
    };
    const builder = new DocumentContextBuilder(prisma as never);
    const result = await builder.build('escritorio-1', 'doc-1', {
      membroId: 'm1',
      permissions: ['document:read:all'],
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fontes[0].trechoOuReferencia).toContain(
        'conteúdo do arquivo não analisado',
      );
    }
  });
});
