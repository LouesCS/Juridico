import { AcceptInvitationUseCase } from './accept-invitation.use-case';

function buildPrisma() {
  const txClient = {
    membro: {
      create: jest.fn().mockResolvedValue({ id: 'membro-novo' }),
      update: jest.fn().mockResolvedValue({ id: 'membro-colaborador' }),
    },
    convite: { update: jest.fn() },
  };
  const bootstrap = {
    convite: { findFirst: jest.fn() },
    usuario: { findFirst: jest.fn(), create: jest.fn() },
    membro: { findFirst: jest.fn() },
  };
  return {
    bootstrapClientSemFiltroDeTenant: bootstrap,
    runBootstrapTransaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(txClient)),
    __txClient: txClient,
    __bootstrap: bootstrap,
  };
}

const passwordService = { hash: jest.fn().mockResolvedValue('hash-fake') };

describe('AcceptInvitationUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o convite não existe', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue(null);

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('idempotente: convite já ACEITO retorna o membro existente sem criar/atualizar de novo', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue({
      id: 'convite-1',
      status: 'ACEITO',
      escritorioId: 'escritorio-1',
      aceitoPorId: 'usuario-1',
    });
    prisma.__bootstrap.membro.findFirst.mockResolvedValue({ id: 'membro-existente' });

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.membroId).toBe('membro-existente');
    expect(prisma.runBootstrapTransaction).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando o convite está expirado', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue({
      id: 'convite-1',
      status: 'PENDENTE',
      expiraEm: new Date(Date.now() - 1000),
      escritorioId: 'escritorio-1',
    });

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('exige nome/sobrenome/senha quando o Usuario ainda não existe', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue({
      id: 'convite-1',
      status: 'PENDENTE',
      expiraEm: new Date(Date.now() + 100000),
      email: 'a@x.com',
      escritorioId: 'escritorio-1',
    });
    prisma.__bootstrap.usuario.findFirst.mockResolvedValue(null);

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });

  it('branch tradicional (convite.membroId nulo): cria um novo Membro espelhando nome/email do Usuario', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue({
      id: 'convite-1',
      status: 'PENDENTE',
      expiraEm: new Date(Date.now() + 100000),
      email: 'a@x.com',
      escritorioId: 'escritorio-1',
      papelId: 'papel-1',
      convidadoPorId: 'membro-convidou',
      membroId: null,
    });
    prisma.__bootstrap.usuario.findFirst.mockResolvedValue({
      id: 'usuario-1',
      nome: 'Ana',
      sobrenome: 'Souza',
      email: 'a@x.com',
    });

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(true);
    expect(prisma.__txClient.membro.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: 'usuario-1',
        escritorioId: 'escritorio-1',
        papelId: 'papel-1',
        status: 'ATIVO',
        nome: 'Ana Souza',
        email: 'a@x.com',
      }),
    });
    expect(prisma.__txClient.membro.update).not.toHaveBeenCalled();
  });

  it('branch Colaboradores (convite.membroId definido): ATUALIZA o Membro existente em vez de criar um novo', async () => {
    const prisma = buildPrisma();
    prisma.__bootstrap.convite.findFirst.mockResolvedValue({
      id: 'convite-1',
      status: 'PENDENTE',
      expiraEm: new Date(Date.now() + 100000),
      email: 'a@x.com',
      escritorioId: 'escritorio-1',
      papelId: 'papel-1',
      convidadoPorId: 'membro-convidou',
      membroId: 'membro-colaborador',
    });
    prisma.__bootstrap.usuario.findFirst.mockResolvedValue({
      id: 'usuario-1',
      nome: 'Ana',
      sobrenome: 'Souza',
      email: 'a@x.com',
    });

    const result = await new AcceptInvitationUseCase(
      prisma as never,
      passwordService as never,
    ).execute('token-x', {});

    expect(result.ok).toBe(true);
    expect(prisma.__txClient.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-colaborador' },
      data: expect.objectContaining({
        usuarioId: 'usuario-1',
        status: 'ATIVO',
        convidadoPorId: 'membro-convidou',
      }),
    });
    expect(prisma.__txClient.membro.create).not.toHaveBeenCalled();
    expect(prisma.__txClient.convite.update).toHaveBeenCalledWith({
      where: { id: 'convite-1' },
      data: expect.objectContaining({ status: 'ACEITO', aceitoPorId: 'usuario-1' }),
    });
  });
});
