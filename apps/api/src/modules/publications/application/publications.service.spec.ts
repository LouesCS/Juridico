import { NotFoundException } from '@nestjs/common';
import { PublicationsService } from './publications.service';

describe('PublicationsService', () => {
  const publication = {
    id: 'publication-1',
    processoId: 'process-1',
    numeroCnj: '12345671920248260001',
  };
  const repository = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };
  const state = { findUnique: jest.fn(), upsert: jest.fn() };
  const prisma = {
    client: {
      publicacaoJudicialCapturada: repository,
      publicacaoEstadoUsuario: state,
      historicoSincronizacaoCaptura: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };
  const service = new PublicationsService(prisma as never, timeline as never);

  beforeEach(() => jest.clearAllMocks());

  it('isola a consulta pelo escritório e pelo estado do membro', async () => {
    repository.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repository.count.mockResolvedValue(0);
    prisma.client.historicoSincronizacaoCaptura.findFirst.mockResolvedValue(null);

    await service.list('office-1', 'member-1', {
      somenteNaoLidas: true,
      sort: '-dataPublicacao',
      page: 1,
      limit: 20,
    } as never);

    expect(repository.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-1',
          estados: { none: { membroId: 'member-1', lidaEm: { not: null } } },
        }),
      }),
    );
  });

  it('marca como lida no estado individual e registra Timeline do processo', async () => {
    repository.findFirst.mockResolvedValue(publication);
    const lidaEm = new Date();
    state.upsert.mockResolvedValue({ lidaEm });

    await expect(service.markRead('office-1', 'member-1', publication.id)).resolves.toEqual({
      lida: true,
      lidaEm,
    });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicacaoId_membroId: { publicacaoId: publication.id, membroId: 'member-1' },
        },
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ escritorioId: 'office-1', processoId: 'process-1' }),
    );
  });

  it('favorita sem alterar a publicação normalizada compartilhada', async () => {
    repository.findFirst.mockResolvedValue(publication);
    state.findUnique.mockResolvedValue(null);
    state.upsert.mockResolvedValue({});

    await expect(service.toggleFavorite('office-1', 'member-1', publication.id)).resolves.toEqual({
      favorita: true,
    });
    expect(state.upsert).toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('exclui somente a publicação do escritório informado', async () => {
    repository.findFirst.mockResolvedValue(publication);

    await service.remove('office-1', 'member-1', publication.id);

    expect(repository.findFirst).toHaveBeenCalledWith({
      where: { id: publication.id, escritorioId: 'office-1' },
      select: { id: true, processoId: true, numeroCnj: true },
    });
    expect(repository.delete).toHaveBeenCalledWith({ where: { id: publication.id } });
  });

  it('não revela publicação pertencente a outro escritório', async () => {
    repository.findFirst.mockResolvedValue(null);
    await expect(service.get('office-2', 'member-1', publication.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
