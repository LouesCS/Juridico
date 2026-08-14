import { RegisterUseCase } from './register.use-case';

describe('RegisterUseCase', () => {
  const usuarioRepository = { buscarPorEmail: jest.fn() };
  const passwordService = { hash: jest.fn().mockResolvedValue('hash') };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };

  const txClient = {
    usuario: { create: jest.fn() },
    escritorio: { create: jest.fn() },
    membro: { create: jest.fn() },
    opcaoPastaJuridica: { upsert: jest.fn().mockResolvedValue({}) },
    campoExtra: { upsert: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    runBootstrapTransaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(txClient)),
    client: {
      papel: { findFirst: jest.fn() },
      escritorio: { findFirst: jest.fn().mockResolvedValue(null) }, // slug sempre livre neste teste
    },
  };

  function buildUseCase() {
    return new RegisterUseCase(
      usuarioRepository as never,
      prisma as never,
      passwordService as never,
      mail as never,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejeita e-mail já cadastrado com EMAIL_ALREADY_EXISTS', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({ id: 'existente' });

    const result = await buildUseCase().execute({
      nome: 'Ricardo',
      sobrenome: 'Almeida',
      email: 'ricardo@x.com',
      senha: 'senha-com-12-caracteres',
      nomeEscritorio: 'Almeida Advogados',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(prisma.client.papel.findFirst).not.toHaveBeenCalled();
  });

  it('lança erro claro se o papel de sistema OWNER não foi semeado', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue(null);
    prisma.client.papel.findFirst.mockResolvedValue(null);

    await expect(
      buildUseCase().execute({
        nome: 'Ricardo',
        sobrenome: 'Almeida',
        email: 'ricardo@x.com',
        senha: 'senha-com-12-caracteres',
        nomeEscritorio: 'Almeida Advogados',
      }),
    ).rejects.toThrow(/seed/);
  });

  it('cria Usuario + Escritorio + Membro(OWNER) em transação única', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue(null);
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-owner' });
    txClient.usuario.create.mockResolvedValue({
      id: 'u1',
      nome: 'Ricardo',
      email: 'ricardo@x.com',
    });
    txClient.escritorio.create.mockResolvedValue({
      id: 'e1',
      slug: 'almeida-advogados',
      nomeFantasia: 'Almeida Advogados',
    });
    txClient.membro.create.mockResolvedValue({ id: 'm1' });

    const result = await buildUseCase().execute({
      nome: 'Ricardo',
      sobrenome: 'Almeida',
      email: 'ricardo@x.com',
      senha: 'senha-com-12-caracteres',
      nomeEscritorio: 'Almeida Advogados',
    });

    expect(result.ok).toBe(true);
    expect(txClient.membro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          escritorioId: 'e1',
          papelId: 'papel-owner',
          status: 'ATIVO',
        }),
      }),
    );
    expect(txClient.campoExtra.upsert).toHaveBeenCalledTimes(12);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ricardo@x.com', template: 'email-verification' }),
    );
  });
});
