import { CreateClientUseCase } from './create-client.use-case';

describe('CreateClientUseCase', () => {
  const prisma = {
    client: {
      cliente: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      campoObrigatorio: { findMany: jest.fn().mockResolvedValue([]) },
      campoExtra: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };

  function buildUseCase() {
    return new CreateClientUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('cria o cliente sem avisos quando não há CPF/CNPJ duplicado', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue(null);
    prisma.client.cliente.create.mockResolvedValue({ id: 'cliente-novo' });

    const result = await buildUseCase().execute('escritorio-1', {
      tipo: 'PESSOA_FISICA',
      nome: 'João da Silva',
      cpf: '52998224725',
      emails: [],
      telefones: [],
    } as never);

    expect(result.avisos).toHaveLength(0);
    expect(result.cliente.id).toBe('cliente-novo');
  });

  it('nunca bloqueia a criação quando o documento já existe — apenas adiciona aviso', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 'cliente-existente' });
    prisma.client.cliente.create.mockResolvedValue({ id: 'cliente-novo' });

    const result = await buildUseCase().execute('escritorio-1', {
      tipo: 'PESSOA_FISICA',
      nome: 'João da Silva',
      cpf: '52998224725',
      emails: [],
      telefones: [],
    } as never);

    expect(prisma.client.cliente.create).toHaveBeenCalled();
    expect(result.avisos).toEqual([
      { codigo: 'DUPLICATE_DOCUMENT', clienteExistenteId: 'cliente-existente' },
    ]);
  });

  it('normaliza o CPF para somente dígitos antes de gravar', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue(null);
    prisma.client.cliente.create.mockResolvedValue({ id: 'cliente-novo' });

    await buildUseCase().execute('escritorio-1', {
      tipo: 'PESSOA_FISICA',
      nome: 'João da Silva',
      cpf: '529.982.247-25',
      emails: [],
      telefones: [],
    } as never);

    expect(prisma.client.cliente.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cpf: '52998224725' }) }),
    );
  });

  it('impede salvar quando um Campo Obrigatório configurado está ausente', async () => {
    prisma.client.campoObrigatorio.findMany.mockResolvedValueOnce([
      { campo: 'enderecoBairro', obrigatorio: true },
    ]);

    await expect(
      buildUseCase().execute('escritorio-1', {
        tipo: 'PESSOA_FISICA',
        nome: 'João da Silva',
        emails: [],
        telefones: [],
      } as never),
    ).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ['enderecoBairro'] })] });
    expect(prisma.client.cliente.create).not.toHaveBeenCalled();
  });

  it('aplica valor padrão e persiste Campo Extra configurado', async () => {
    prisma.client.campoExtra.findMany.mockResolvedValueOnce([
      {
        id: 'campo-1',
        nome: 'Origem',
        tipo: 'TEXTO',
        obrigatorio: true,
        opcoes: [],
        valorPadrao: 'Site',
      },
    ]);
    prisma.client.cliente.findFirst.mockResolvedValue(null);
    prisma.client.cliente.create.mockResolvedValue({ id: 'cliente-novo' });

    await buildUseCase().execute('escritorio-1', {
      tipo: 'PESSOA_FISICA',
      nome: 'João da Silva',
      emails: [],
      telefones: [],
    } as never);

    expect(prisma.client.cliente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ camposExtrasValores: { 'campo-1': 'Site' } }),
      }),
    );
  });
});
