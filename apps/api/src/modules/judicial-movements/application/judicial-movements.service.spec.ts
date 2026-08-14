import { NotFoundException } from '@nestjs/common';
import { JudicialMovementsService } from './judicial-movements.service';

describe('JudicialMovementsService', () => {
  const movement = { id: 'movement-1', processoId: 'process-1', numeroCnj: '12345671920248260001' };
  const repository = { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  const state = { findUnique: jest.fn(), upsert: jest.fn() };
  const prisma = {
    client: {
      movimentoJudicialCapturado: repository,
      movimentoEstadoUsuario: state,
      historicoSincronizacaoCaptura: { findFirst: jest.fn() },
    },
  };
  const timeline = { record: jest.fn() };
  const service = new JudicialMovementsService(prisma as never, timeline as never);

  beforeEach(() => jest.clearAllMocks());

  it('isola listagem, favorito e relações pelo escritório e membro', async () => {
    repository.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repository.count.mockResolvedValue(0);
    prisma.client.historicoSincronizacaoCaptura.findFirst.mockResolvedValue(null);
    await service.list('office-1', 'member-1', {
      somenteFavoritas: true,
      sort: '-dataMovimento',
      page: 1,
      limit: 20,
    } as never);
    expect(repository.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-1',
          estados: { some: { membroId: 'member-1', favoritaEm: { not: null } } },
        }),
      }),
    );
  });

  it('favorita em estado individual e registra ação na Timeline do Processo', async () => {
    repository.findFirst.mockResolvedValue(movement);
    state.findUnique.mockResolvedValue(null);
    state.upsert.mockResolvedValue({});
    await expect(service.toggleFavorite('office-1', 'member-1', movement.id)).resolves.toEqual({
      favorita: true,
    });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { movimentoId_membroId: { movimentoId: movement.id, membroId: 'member-1' } },
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({
        escritorioId: 'office-1',
        processoId: 'process-1',
        entidadeRelacionadaTipo: 'MOVIMENTACAO_JUDICIAL',
      }),
    );
  });

  it('registra visualização explícita, mas a listagem não escreve Timeline', async () => {
    repository.findFirst.mockResolvedValue(movement);
    await service.viewed('office-1', 'member-1', movement.id);
    expect(timeline.record).toHaveBeenCalledTimes(1);
  });

  it('não revela movimentação de outro escritório', async () => {
    repository.findFirst.mockResolvedValue(null);
    await expect(service.get('office-2', 'member-1', movement.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
