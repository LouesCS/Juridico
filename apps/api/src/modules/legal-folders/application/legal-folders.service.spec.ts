import { LegalFoldersService } from './legal-folders.service';

describe('LegalFoldersService detail', () => {
  it('carrega clienteId das partes no DTO de detalhe sem consulta por parte', async () => {
    const client = {
      pastaJuridica: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'folder-1',
          encarregadoId: 'member-1',
          processos: [],
        }),
      },
      membro: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new LegalFoldersService({ client } as never);
    await service.get(
      {
        escritorioId: 'office-1',
        membroId: 'member-1',
        permissions: ['legal-folder:read:all'],
      } as never,
      'folder-1',
    );
    expect(client.pastaJuridica.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          processos: expect.objectContaining({
            select: expect.objectContaining({
              processo: expect.objectContaining({
                select: expect.objectContaining({
                  partes: expect.objectContaining({
                    select: expect.objectContaining({ clienteId: true }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('reserva a sequência no banco e cria Etapa Cadastramento no mesmo transaction callback', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ numero: 7 }]),
      cliente: { findFirst: jest.fn().mockResolvedValue({ nome: 'Maria Oliveira' }) },
      prefixoPastaJuridica: { upsert: jest.fn().mockResolvedValue({}) },
      pastaJuridica: {
        create: jest.fn().mockResolvedValue({ id: 'folder-7', nome: 'MARIAOLIVEIRA/7' }),
      },
    };
    const client = {
      cliente: { count: jest.fn().mockResolvedValue(1) },
      membro: { findFirst: jest.fn().mockResolvedValue({ id: 'member-1' }) },
      processo: { count: jest.fn() },
      campoObrigatorio: { findMany: jest.fn().mockResolvedValue([]) },
      campoExtra: { findMany: jest.fn().mockResolvedValue([]) },
      opcaoPastaJuridica: { count: jest.fn().mockResolvedValue(2) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new LegalFoldersService({ client } as never);
    const result = await service.create(
      { escritorioId: 'office-1', membroId: 'member-1', permissions: [] } as never,
      {
        assunto: 'Revisão',
        categoria: 'Cível',
        situacao: 'ANDAMENTO_FAVORAVEL',
        confidencial: false,
        clientePrincipalId: 'client-1',
        encarregadoId: 'member-1',
        processoIds: [],
        outrosClienteIds: [],
        outrasPartesContrariasIds: [],
        interessadoIds: [],
        camposExtrasValores: {},
      },
    );
    expect(result).toEqual({ id: 'folder-7', nome: 'MARIAOLIVEIRA/7' });
    expect(tx.prefixoPastaJuridica.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          escritorioId_prefixo: { escritorioId: 'office-1', prefixo: 'MARIAOLIVEIRA' },
        }),
      }),
    );
    expect(tx.pastaJuridica.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          escritorioId: 'office-1',
          nome: 'MARIAOLIVEIRA/7',
          prefixo: 'MARIAOLIVEIRA',
          sequencial: 7,
          etapa: 'CADASTRAMENTO',
          assunto: 'Revisão',
          categoria: 'Cível',
        }),
      }),
    );
  });

  it('conclui usando dataConclusao sem alterar situação ou arquivamento', async () => {
    const update = jest.fn().mockResolvedValue({});
    const service = new LegalFoldersService({ client: { pastaJuridica: { update } } } as never);
    jest.spyOn(service, 'get').mockResolvedValue({ dataConclusao: null } as never);
    await service.complete({ escritorioId: 'office-1' } as never, 'folder-1');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
      data: { dataConclusao: expect.any(Date) },
    });
  });

  it('copia somente dados cadastrais e reinicia o ciclo operacional', async () => {
    const service = new LegalFoldersService({ client: {} } as never);
    jest.spyOn(service, 'get').mockResolvedValue({
      assunto: 'Revisão',
      categoria: 'Cível',
      situacao: 'ANDAMENTO_FAVORAVEL',
      confidencial: true,
      clientePrincipal: { id: 'client-1' },
      parteContrariaPrincipal: null,
      encarregadoId: 'member-1',
      observacoes: 'Nota',
      camposExtrasValores: { campo: 'valor' },
      vinculosClientes: [],
    } as never);
    const create = jest
      .spyOn(service, 'create')
      .mockResolvedValue({ id: 'copy-1', nome: 'CLIENTE/2' });
    await service.copy({ escritorioId: 'office-1' } as never, 'folder-1');
    expect(create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dataConclusao: null,
        processoIds: [],
        camposExtrasValores: { campo: 'valor' },
      }),
    );
  });
});
