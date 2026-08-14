import { DeleteClientUseCase } from './delete-client.use-case';

describe('DeleteClientUseCase', () => {
  const prisma = {
    client: {
      cliente: { findFirst: jest.fn(), update: jest.fn() },
      processo: { count: jest.fn() },
    },
  };

  function buildUseCase() {
    return new DeleteClientUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o cliente não existe no escritório', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'cliente-x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('bloqueia a exclusão quando existe processo vinculado (HAS_ACTIVE_LEGAL_CASES)', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.processo.count.mockResolvedValue(2);

    const result = await buildUseCase().execute('escritorio-1', 'cliente-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('HAS_ACTIVE_LEGAL_CASES');
    expect(prisma.client.cliente.update).not.toHaveBeenCalled();
  });

  it('faz soft delete quando não há processo vinculado', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.processo.count.mockResolvedValue(0);

    const result = await buildUseCase().execute('escritorio-1', 'cliente-1');

    expect(result.ok).toBe(true);
    expect(prisma.client.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });
});
