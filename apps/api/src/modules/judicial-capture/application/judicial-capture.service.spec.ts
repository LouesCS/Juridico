import { JudicialCaptureService } from './judicial-capture.service';

function setup() {
  const client = {
    configuracaoCaptura: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    processo: { findFirst: jest.fn() },
    pastaJuridicaProcesso: { findMany: jest.fn() },
    membro: { findFirst: jest.fn(), findMany: jest.fn() },
    movimentoJudicialCapturado: { createMany: jest.fn() },
    historicoSincronizacaoCaptura: { create: jest.fn() },
    $transaction: jest.fn(async () => []),
  };
  const provider = { findProcess: jest.fn() };
  const timeline = { record: jest.fn() };
  return {
    client,
    provider,
    timeline,
    service: new JudicialCaptureService({ client } as never, provider as never, timeline as never),
  };
}
describe('JudicialCaptureService', () => {
  const user = {
    escritorioId: 'office-1',
    membroId: 'member-1',
    permissions: ['case:read:all', 'legal-folder:read:all'],
  } as never;
  it('bloqueia CNJ inválido antes do provider', async () => {
    const s = setup();
    await expect(s.service.verify('office-1', '123')).rejects.toThrow('Número CNJ inválido.');
    expect(s.provider.findProcess).not.toHaveBeenCalled();
  });
  it('isola listagem pelo escritório', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findMany.mockResolvedValue([]);
    s.client.configuracaoCaptura.count.mockResolvedValue(0);
    await s.service.list('office-1', { sort: '-criadoEm', page: 1, limit: 20 }, user);
    expect(s.client.configuracaoCaptura.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ escritorioId: 'office-1' }) }),
    );
  });
  it('filtra por Pasta e período de criação e ordena pelo criadoEm da configuração', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findMany.mockResolvedValue([]);
    s.client.configuracaoCaptura.count.mockResolvedValue(0);
    await s.service.list(
      'office-1',
      {
        pastaJuridicaId: 'folder-1',
        criadoDe: '2026-08-01T00:00:00.000Z',
        criadoAte: '2026-08-09T23:59:59.000Z',
        sort: 'criadoEm',
        page: 1,
        limit: 20,
      },
      user,
    );
    expect(s.client.configuracaoCaptura.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          criadoEm: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lte: new Date('2026-08-09T23:59:59.000Z'),
          },
          pastaJuridicaId: 'folder-1',
          processo: expect.objectContaining({
            pastasJuridicas: { some: { pastaJuridicaId: 'folder-1' } },
          }),
        }),
        orderBy: { criadoEm: 'asc' },
      }),
    );
    await s.service.list('office-1', { sort: '-criadoEm', page: 1, limit: 20 }, user);
    expect(s.client.configuracaoCaptura.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ orderBy: { criadoEm: 'desc' } }),
    );
  });
  it('não expõe Pasta sem escopo de leitura do Processo', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findMany.mockResolvedValue([
      {
        id: 'capture-1',
        processo: {
          id: 'case-1',
          titulo: 'Processo',
          cliente: { id: 'client-1', nome: 'Cliente' },
          segredoJustica: false,
          responsavelPrincipalId: 'other-member',
          equipe: [],
          partes: [],
          pastasJuridicas: [
            {
              pastaJuridica: {
                id: 'folder-1',
                nome: 'Pasta sigilosa',
                encarregadoId: 'other-member',
                confidencial: false,
              },
            },
          ],
        },
      },
    ]);
    s.client.configuracaoCaptura.count.mockResolvedValue(1);
    const result = await s.service.list('office-1', { sort: '-criadoEm', page: 1, limit: 20 }, {
      escritorioId: 'office-1',
      membroId: 'member-1',
      permissions: ['case:read:assigned'],
    } as never);
    expect(result.items[0].pasta).toBeNull();
    expect(result.items[0].processo?.pastasJuridicas).toEqual([]);
  });
  it('expõe uma Pasta acessível sem consulta por linha e não escolhe entre múltiplas', async () => {
    const s = setup();
    const process = {
      id: 'case-1',
      titulo: 'Processo',
      cliente: { id: 'client-1', nome: 'Cliente' },
      segredoJustica: false,
      responsavelPrincipalId: 'member-1',
      equipe: [],
      partes: [],
    };
    s.client.configuracaoCaptura.findMany.mockResolvedValue([
      {
        id: 'one',
        processo: {
          ...process,
          pastasJuridicas: [
            {
              pastaJuridica: {
                id: 'folder-1',
                nome: 'Pasta principal',
                encarregadoId: 'member-1',
                confidencial: false,
              },
            },
          ],
        },
      },
      {
        id: 'many',
        processo: {
          ...process,
          pastasJuridicas: [
            {
              pastaJuridica: {
                id: 'folder-1',
                nome: 'Pasta 1',
                encarregadoId: 'member-1',
                confidencial: false,
              },
            },
            {
              pastaJuridica: {
                id: 'folder-2',
                nome: 'Pasta 2',
                encarregadoId: 'member-1',
                confidencial: false,
              },
            },
          ],
        },
      },
    ]);
    s.client.configuracaoCaptura.count.mockResolvedValue(2);
    const result = await s.service.list('office-1', { sort: '-criadoEm', page: 1, limit: 20 }, {
      escritorioId: 'office-1',
      membroId: 'member-1',
      permissions: ['case:read:assigned', 'legal-folder:read:assigned'],
    } as never);
    expect(result.items[0].pasta).toEqual({ id: 'folder-1', nome: 'Pasta principal' });
    expect(result.items[1].pasta).toBeNull();
    expect(s.client.configuracaoCaptura.findMany).toHaveBeenCalledTimes(1);
  });
  it('vincula ao Processo existente sem criar uma segunda entidade', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findFirst.mockResolvedValue(null);
    s.client.processo.findFirst.mockResolvedValue({ id: 'process-1' });
    s.client.pastaJuridicaProcesso.findMany.mockResolvedValue([]);
    s.client.configuracaoCaptura.create.mockResolvedValue({ id: 'capture-1' });
    await s.service.create('office-1', {
      numeroCnj: '1234567-19.2024.8.26.0001',
      capturaAtiva: true,
    });
    expect(s.client.configuracaoCaptura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        escritorioId: 'office-1',
        processoId: 'process-1',
        numeroCnjSomenteDigitos: '12345671920248260001',
      }),
    });
  });
  it('deduplica pelo índice externo usando createMany skipDuplicates', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findFirst.mockResolvedValue({
      id: 'capture-1',
      escritorioId: 'office-1',
      capturaAtiva: true,
      processoId: null,
      numeroCnjSomenteDigitos: '12345671920248260001',
    });
    s.client.configuracaoCaptura.update.mockResolvedValue({});
    s.provider.findProcess.mockResolvedValue({
      movements: [
        {
          externalId: 'movement-1',
          cnj: '12345671920248260001',
          date: new Date(),
          type: '26',
          description: 'Distribuição',
          provider: 'DATAJUD',
        },
      ],
    });
    s.client.movimentoJudicialCapturado.createMany.mockResolvedValue({ count: 0 });
    const result = await s.service.sync('office-1', 'capture-1', 'actor-1');
    expect(s.client.movimentoJudicialCapturado.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result).toEqual({ novidades: 0, resultado: 'SEM_NOVIDADES' });
  });
  it('excluir remove somente a configuração', async () => {
    const s = setup();
    s.client.configuracaoCaptura.findFirst.mockResolvedValue({ id: 'capture-1' });
    await s.service.remove('office-1', 'capture-1');
    expect(s.client.configuracaoCaptura.delete).toHaveBeenCalledWith({
      where: { id: 'capture-1' },
    });
    expect(s.client.processo.findFirst).not.toHaveBeenCalled();
  });
});
