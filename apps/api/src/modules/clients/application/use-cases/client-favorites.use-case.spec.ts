import { ToggleClientFavoriteUseCase } from './client-favorites.use-case';

function buildPrisma() {
  return {
    client: {
      cliente: { findFirst: jest.fn() },
      clienteFavorito: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
      processo: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

function buildTimeline() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

describe('ToggleClientFavoriteUseCase', () => {
  it('retorna NOT_FOUND quando o cliente não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.cliente.findFirst.mockResolvedValue(null);

    const result = await new ToggleClientFavoriteUseCase(prisma as never, buildTimeline() as never).execute(
      'escritorio-1',
      'cliente-x',
      'membro-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('favorita quando ainda não era favorito', async () => {
    const prisma = buildPrisma();
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', nome: 'Ana' });
    prisma.client.clienteFavorito.findFirst.mockResolvedValue(null);

    const result = await new ToggleClientFavoriteUseCase(prisma as never, buildTimeline() as never).execute(
      'escritorio-1',
      'cliente-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.favorito).toBe(true);
    expect(prisma.client.clienteFavorito.create).toHaveBeenCalledWith({
      data: { clienteId: 'cliente-1', membroId: 'membro-1' },
    });
  });

  it('desfavorita quando já era favorito', async () => {
    const prisma = buildPrisma();
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', nome: 'Ana' });
    prisma.client.clienteFavorito.findFirst.mockResolvedValue({
      clienteId: 'cliente-1',
      membroId: 'membro-1',
    });

    const result = await new ToggleClientFavoriteUseCase(prisma as never, buildTimeline() as never).execute(
      'escritorio-1',
      'cliente-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.favorito).toBe(false);
    expect(prisma.client.clienteFavorito.delete).toHaveBeenCalledWith({
      where: { clienteId_membroId: { clienteId: 'cliente-1', membroId: 'membro-1' } },
    });
  });

  it('registra evento de Timeline em cada processo vinculado ao favoritar', async () => {
    const prisma = buildPrisma();
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1', nome: 'Ana' });
    prisma.client.clienteFavorito.findFirst.mockResolvedValue(null);
    prisma.client.processo.findMany.mockResolvedValue([{ id: 'processo-1' }, { id: 'processo-2' }]);
    const timeline = buildTimeline();

    await new ToggleClientFavoriteUseCase(prisma as never, timeline as never).execute(
      'escritorio-1',
      'cliente-1',
      'membro-1',
    );

    expect(timeline.record).toHaveBeenCalledTimes(2);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ processoId: 'processo-1', tipo: 'PERSONALIZADO' }),
    );
  });
});
