import { JudicialMovementSearchAdapter } from './search-adapters';

describe('JudicialMovementSearchAdapter', () => {
  it('bloqueia busca sem movement:read', async () => {
    const repository = { count: jest.fn(), findMany: jest.fn() };
    const adapter = new JudicialMovementSearchAdapter({
      client: { movimentoJudicialCapturado: repository },
    } as never);
    await expect(
      adapter.search({
        escritorioId: 'office-1',
        q: 'intimação',
        limit: 8,
        user: { permissions: [] },
      } as never),
    ).resolves.toEqual({ type: 'judicial-movements', total: 0, items: [] });
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('pesquisa descrição e relações sempre dentro do tenant', async () => {
    const repository = {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'movement-1',
          numeroCnj: '123',
          descricao: 'Intimação expedida',
          tribunal: 'TJSP',
          tipo: 'INTIMACAO',
          provider: 'DATAJUD',
          dataMovimento: new Date(),
          processo: { titulo: 'Ação', cliente: { nome: 'Maria' } },
        },
      ]),
    };
    const adapter = new JudicialMovementSearchAdapter({
      client: { movimentoJudicialCapturado: repository },
    } as never);
    const result = await adapter.search({
      escritorioId: 'office-1',
      q: 'intimação',
      limit: 8,
      user: { permissions: ['movement:read'] },
    } as never);
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ escritorioId: 'office-1' }) }),
    );
    expect(result.items[0]).toMatchObject({
      tipo: 'judicial-movements',
      url: '/movimentacoes-judiciais?movimentacao=movement-1',
    });
  });
});
