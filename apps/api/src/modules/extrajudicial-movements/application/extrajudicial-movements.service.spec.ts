import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExtrajudicialMovementsService } from './extrajudicial-movements.service';

const query = {
  sort: '-dataMovimentacao' as const,
  page: 2,
  limit: 10,
  pastaJuridicaId: '11111111-1111-4111-8111-111111111111',
};

describe('ExtrajudicialMovementsService — Pasta Jurídica', () => {
  it('recusa vínculo da Movimentação Extrajudicial com Processo Judicial', async () => {
    const client = {
      processo: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await expect(service.create('office-a', 'member-1', {
      dataMovimentacao: '2026-08-10T12:00:00.000Z',
      processoId: '11111111-1111-4111-8111-111111111111',
      responsavelId: 'member-1',
      tipo: 'Contato',
      origem: 'Integração',
      status: 'Pendente',
      descricao: 'Movimentação recebida',
    })).rejects.toThrow('Processo Extrajudicial inválido.');
    expect(client.processo.findFirst).toHaveBeenCalledWith({
      where: { id: '11111111-1111-4111-8111-111111111111', escritorioId: 'office-a', tipo: 'EXTRAJUDICIAL' },
      select: { clienteId: true },
    });
  });
  it('lista, conta, pagina e ordena pelo vínculo explícito e tenant autenticado', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(23);
    const client = { movimentacaoExtrajudicial: { findMany, count } };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    const result = await service.list('office-a', 'member-a', query as never);
    expect(findMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId: 'office-a',
          pastaJuridicaId: query.pastaJuridicaId,
        }),
        skip: 10,
        take: 10,
        orderBy: { dataMovimentacao: 'desc' },
      }),
    );
    expect(result.total).toBe(23);
  });

  it('persiste a Pasta Jurídica contextual quando pertence ao mesmo tenant', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({
      ...data,
      id: 'movement-1',
      cliente: { id: 'client-1', nome: 'Cliente' },
      processo: null,
      pasta: null,
      pastaJuridica: { id: data.pastaJuridicaId, nome: 'PASTA/1' },
      responsavel: { id: 'member-1', nome: 'Responsável' },
      estados: [],
    }));
    const client = {
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'client-1' }) },
      pastaJuridica: { findFirst: jest.fn().mockResolvedValue({ id: query.pastaJuridicaId }) },
      campoExtra: { findMany: jest.fn().mockResolvedValue([]) },
      movimentacaoExtrajudicial: { create },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await service.create('office-a', 'member-1', {
      dataMovimentacao: '2026-08-10T12:00:00.000Z',
      clienteId: 'client-1',
      pastaJuridicaId: query.pastaJuridicaId,
      responsavelId: 'member-1',
      tipo: 'Contato',
      origem: 'Manual',
      status: 'Pendente',
      descricao: 'Contato extrajudicial',
    });
    expect(client.pastaJuridica.findFirst).toHaveBeenCalledWith({
      where: { id: query.pastaJuridicaId, escritorioId: 'office-a', excluidoEm: null },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pastaJuridicaId: query.pastaJuridicaId }),
      }),
    );
  });

  it('recusa vínculo com Pasta Jurídica de outro tenant', async () => {
    const client = {
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'client-1' }) },
      pastaJuridica: { findFirst: jest.fn().mockResolvedValue(null) },
      campoExtra: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await expect(
      service.create('office-a', 'member-1', {
        dataMovimentacao: '2026-08-10T12:00:00.000Z',
        clienteId: 'client-1',
        pastaJuridicaId: query.pastaJuridicaId,
        responsavelId: 'member-1',
        tipo: 'Contato',
        origem: 'Manual',
        status: 'Pendente',
        descricao: 'Contato extrajudicial',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('alterna leitura somente após validar a movimentação no tenant', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const client = {
      movimentacaoExtrajudicial: {
        findFirst: jest.fn().mockResolvedValue({ id: 'movement-1', escritorioId: 'office-a' }),
      },
      movimentacaoExtrajudicialEstadoUsuario: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert,
      },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await expect(service.toggleRead('office-a', 'member-1', 'movement-1')).resolves.toEqual({
      lida: true,
    });
    expect(client.movimentacaoExtrajudicial.findFirst).toHaveBeenCalledWith({
      where: { id: 'movement-1', escritorioId: 'office-a', excluidoEm: null },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { movimentacaoId_membroId: { movimentacaoId: 'movement-1', membroId: 'member-1' } },
        create: expect.objectContaining({
          movimentacaoId: 'movement-1',
          membroId: 'member-1',
          lidaEm: expect.any(Date),
        }),
      }),
    );
  });

  it('retorna detalhe com relações, leitura do membro e tarefas em lote', async () => {
    const movement = {
      id: 'movement-1',
      escritorioId: 'office-a',
      clienteId: 'client-1',
      processoId: 'case-1',
      pastaId: null,
      descricao: 'Descrição integral',
      cliente: { id: 'client-1', nome: 'Cliente' },
      processo: { id: 'case-1', titulo: 'Processo', numeroCnj: '0000000-00.2026.0.00.0000' },
      pasta: null,
      pastaJuridica: {
        id: 'folder-1',
        nome: 'PASTA/1',
        confidencial: false,
        encarregadoId: 'member-1',
      },
      responsavel: { id: 'member-1', nome: 'Responsável' },
      estados: [{ favoritaEm: null, lidaEm: new Date() }],
    };
    const client = {
      movimentacaoExtrajudicial: { findFirst: jest.fn().mockResolvedValue(movement) },
      documento: { findMany: jest.fn().mockResolvedValue([]) },
      tarefaVinculo: {
        findMany: jest.fn().mockResolvedValue([{ tarefa: { id: 'task-1', titulo: 'Tarefa' } }]),
      },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    const result = await service.get('office-a', 'member-1', 'movement-1');
    expect(client.movimentacaoExtrajudicial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'movement-1', escritorioId: 'office-a', excluidoEm: null },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        descricao: 'Descrição integral',
        lida: true,
        pastaJuridica: expect.objectContaining({ id: 'folder-1' }),
        processo: expect.objectContaining({ id: 'case-1' }),
        tarefas: [{ id: 'task-1', titulo: 'Tarefa' }],
      }),
    );
  });

  it('responde como inexistente quando o detalhe não pertence ao tenant', async () => {
    const client = { movimentacaoExtrajudicial: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await expect(
      service.get('office-a', 'member-1', 'movement-other-tenant'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove logicamente sem apagar vínculos relacionados', async () => {
    const update = jest.fn().mockResolvedValue({});
    const item = {
      id: 'movement-1',
      escritorioId: 'office-a',
      pastaJuridicaId: 'folder-1',
      processoId: 'case-1',
      descricao: 'Movimentação externa',
    };
    const client = {
      movimentacaoExtrajudicial: {
        findFirst: jest.fn().mockResolvedValue(item),
        update,
      },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: jest.fn() } as never,
    );
    await service.remove('office-a', 'member-1', 'movement-1');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'movement-1' },
      data: { excluidoEm: expect.any(Date) },
    });
  });

  it('não duplica lançamento já existente na timeline da Pasta', async () => {
    const timelineRecord = jest.fn();
    const client = {
      movimentacaoExtrajudicial: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'movement-1',
          escritorioId: 'office-a',
          pastaJuridicaId: 'folder-1',
          descricao: 'Movimentação externa',
        }),
      },
      eventoTimeline: { findFirst: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    };
    const service = new ExtrajudicialMovementsService(
      { client } as never,
      { record: timelineRecord } as never,
    );
    await expect(
      service.publishToFolderTimeline('office-a', 'member-1', 'movement-1'),
    ).resolves.toEqual({ lancada: true, duplicada: true });
    expect(timelineRecord).not.toHaveBeenCalled();
  });
});
