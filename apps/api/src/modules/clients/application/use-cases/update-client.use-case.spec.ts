import { UpdateClientUseCase } from './update-client.use-case';

describe('UpdateClientUseCase', () => {
  const prisma = {
    client: {
      cliente: { findFirst: jest.fn(), update: jest.fn() },
      processo: { findMany: jest.fn() },
      campoObrigatorio: { findMany: jest.fn().mockResolvedValue([]) },
      campoExtra: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'campo-1',
            nome: 'Campo 1',
            tipo: 'TEXTO',
            obrigatorio: false,
            opcoes: [],
            valorPadrao: null,
          },
        ]),
      },
    },
  };
  const timeline = { record: jest.fn() };

  function buildUseCase() {
    return new UpdateClientUseCase(prisma as never, timeline as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o cliente não existe no escritório', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute('escritorio-1', 'cliente-x', {} as never);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('registra CLIENTE_ATUALIZADO na Timeline de cada processo vinculado', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.cliente.update.mockResolvedValue({ nome: 'João da Silva' });
    prisma.client.processo.findMany.mockResolvedValue([{ id: 'processo-1' }, { id: 'processo-2' }]);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'cliente-1',
      { telefones: ['11999990000'] } as never,
      'membro-1',
    );

    expect(result.ok).toBe(true);
    expect(timeline.record).toHaveBeenCalledTimes(2);
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({
        processoId: 'processo-1',
        tipo: 'CLIENTE_ATUALIZADO',
        autorId: 'membro-1',
        entidadeRelacionadaId: 'cliente-1',
      }),
    );
    expect(timeline.record).toHaveBeenCalledWith(
      expect.objectContaining({ processoId: 'processo-2', tipo: 'CLIENTE_ATUALIZADO' }),
    );
  });

  it('não registra nenhum evento quando o cliente não tem processos vinculados', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.cliente.update.mockResolvedValue({ nome: 'João da Silva' });
    prisma.client.processo.findMany.mockResolvedValue([]);

    await buildUseCase().execute('escritorio-1', 'cliente-1', {} as never);

    expect(timeline.record).not.toHaveBeenCalled();
  });

  it('encaminha todos os campos editáveis para o Prisma — "Editar" cobre o mesmo conjunto de campos do cadastro (correção "Edição completa em Clientes e Contatos")', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({
      id: 'cliente-1',
      telefones: ['11999990000'],
      emails: ['a@example.com'],
    });
    prisma.client.cliente.update.mockResolvedValue({ nome: 'João da Silva' });
    prisma.client.processo.findMany.mockResolvedValue([]);

    const dto = {
      nome: 'João da Silva',
      nomeSocial: 'Joãozinho',
      razaoSocial: undefined,
      cpf: '52998224725',
      emails: ['joao@example.com'],
      telefones: ['11999990000', '11988880000'],
      enderecoLogradouro: 'Rua das Flores',
      enderecoNumero: '123',
      enderecoComplemento: 'Apto 45',
      enderecoBairro: 'Centro',
      enderecoCidade: 'São Paulo',
      enderecoUf: 'SP',
      enderecoCep: '01310000',
      observacoes: 'Cliente antigo.',
      responsavelId: 'membro-2',
      avatarUrl: 'https://example.com/foto.png',
      nomeMae: 'Maria da Silva',
      nomePai: 'José da Silva',
      estadoCivil: 'CASADO',
      profissao: 'Engenheiro',
      dataNascimento: '1985-03-20',
      camposExtrasValores: { 'campo-1': 'valor-1' },
    } as never;

    await buildUseCase().execute('escritorio-1', 'cliente-1', dto);

    expect(prisma.client.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cliente-1' },
        data: expect.objectContaining({
          nomeSocial: 'Joãozinho',
          emails: ['joao@example.com'],
          telefones: ['11999990000', '11988880000'],
          enderecoLogradouro: 'Rua das Flores',
          enderecoNumero: '123',
          enderecoComplemento: 'Apto 45',
          enderecoBairro: 'Centro',
          enderecoCidade: 'São Paulo',
          enderecoUf: 'SP',
          enderecoCep: '01310000',
          observacoes: 'Cliente antigo.',
          responsavelId: 'membro-2',
          avatarUrl: 'https://example.com/foto.png',
          nomeMae: 'Maria da Silva',
          nomePai: 'José da Silva',
          estadoCivil: 'CASADO',
          profissao: 'Engenheiro',
          dataNascimento: new Date('1985-03-20'),
          camposExtrasValores: { 'campo-1': 'valor-1' },
        }),
      }),
    );
  });

  it('avisa sobre documento duplicado sem bloquear a atualização', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    prisma.client.cliente.findFirst
      .mockResolvedValueOnce({ id: 'cliente-1' })
      .mockResolvedValueOnce({ id: 'cliente-existente' });
    prisma.client.cliente.update.mockResolvedValue({ nome: 'João da Silva' });
    prisma.client.processo.findMany.mockResolvedValue([]);

    const result = await buildUseCase().execute('escritorio-1', 'cliente-1', {
      cpf: '52998224725',
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.avisos).toEqual([
        { codigo: 'DUPLICATE_DOCUMENT', clienteExistenteId: 'cliente-existente' },
      ]);
  });
});
