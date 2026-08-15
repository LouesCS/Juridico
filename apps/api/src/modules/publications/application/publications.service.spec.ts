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
    update: jest.fn(),
  };
  const state = { findUnique: jest.fn(), upsert: jest.fn() };
  const taskLinks = { findMany: jest.fn(), groupBy: jest.fn(), count: jest.fn() };
  const folders = { findFirst: jest.fn() };
  const folderProcesses = { findFirst: jest.fn() };
  const prisma = {
    client: {
      publicacaoJudicialCapturada: repository,
      publicacaoEstadoUsuario: state,
      historicoSincronizacaoCaptura: { findFirst: jest.fn() },
      tarefaVinculo: taskLinks,
      eventoTimeline: { findMany: jest.fn() },
      pastaJuridica: folders,
      pastaJuridicaProcesso: folderProcesses,
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

  it('vincula somente Processo Judicial pertencente à Pasta', async () => {
    repository.findFirst.mockResolvedValue(publication);
    folders.findFirst.mockResolvedValue({ id: 'folder-1' });
    folderProcesses.findFirst.mockResolvedValue({ processoId: 'process-1' });
    repository.update.mockResolvedValue({
      id: publication.id,
      pastaJuridicaId: 'folder-1',
      processoId: 'process-1',
    });
    await service.link('office-1', 'member-1', publication.id, {
      pastaJuridicaId: 'folder-1',
      processoId: 'process-1',
    });
    expect(folderProcesses.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pastaJuridicaId: 'folder-1', processoId: 'process-1' }),
      }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { pastaJuridicaId: 'folder-1', processoId: 'process-1' } }),
    );
  });

  it('oculta sem excluir a publicação', async () => {
    repository.findFirst.mockResolvedValue({ ...publication, oculta: false });
    repository.update.mockResolvedValue({});
    await expect(service.toggleHidden('office-1', 'member-1', publication.id)).resolves.toEqual({
      oculta: true,
    });
    expect(repository.update).toHaveBeenCalledWith({
      where: { id: publication.id },
      data: { oculta: true },
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('filtra por lançamento formal na Timeline usando o ID da Publicação', async () => {
    repository.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repository.count.mockResolvedValue(0);
    prisma.client.historicoSincronizacaoCaptura.findFirst.mockResolvedValue(null);
    prisma.client.eventoTimeline.findMany.mockResolvedValue([
      { entidadeRelacionadaId: 'publication-1' },
    ]);

    await service.list('office-1', 'member-1', {
      timeline: 'COM',
      sort: '-dataPublicacao',
      page: 1,
      limit: 20,
    } as never);

    expect(prisma.client.eventoTimeline.findMany).toHaveBeenCalledWith({
      where: {
        escritorioId: 'office-1',
        excluidoEm: null,
        entidadeRelacionadaTipo: 'PUBLICACAO',
        entidadeRelacionadaId: { not: null },
      },
      select: { entidadeRelacionadaId: true },
      distinct: ['entidadeRelacionadaId'],
    });
    expect(repository.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [expect.objectContaining({ id: { in: ['publication-1'] } })],
        }),
      }),
    );
  });

  it('aplica a busca textual aos campos capturados exibidos na grid', async () => {
    repository.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repository.count.mockResolvedValue(0);
    prisma.client.historicoSincronizacaoCaptura.findFirst.mockResolvedValue(null);

    await service.list('office-1', 'member-1', {
      q: 'Curitiba',
      sort: '-dataPublicacao',
      page: 1,
      limit: 20,
    } as never);

    const where = repository.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { conteudo: { contains: 'Curitiba', mode: 'insensitive' } },
        { nomeVinculo: { contains: 'Curitiba', mode: 'insensitive' } },
        { cidade: { contains: 'Curitiba', mode: 'insensitive' } },
        { diario: { contains: 'Curitiba', mode: 'insensitive' } },
        { orgao: { contains: 'Curitiba', mode: 'insensitive' } },
        { vara: { contains: 'Curitiba', mode: 'insensitive' } },
      ]),
    );
  });
});
