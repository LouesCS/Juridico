import { GetLegalCaseUseCase } from './get-legal-case.use-case';

function buildUser(permissions: string[], membroId = 'membro-1') {
  return {
    usuarioId: 'usuario-1',
    membroId,
    escritorioId: 'escritorio-1',
    sessionId: 'sessao-1',
    roles: [],
    permissions,
  };
}

function buildProcesso(overrides: Record<string, unknown> = {}) {
  return {
    id: 'processo-1',
    responsavelPrincipalId: 'membro-1',
    segredoJustica: false,
    versao: 1,
    cliente: { id: 'cliente-1', nome: 'Cliente X', tipo: 'PESSOA_FISICA' },
    valorCausaCentavos: null,
    ...overrides,
  };
}

describe('GetLegalCaseUseCase', () => {
  const prisma = {
    client: {
      processo: { findFirst: jest.fn() },
      membro: { findFirst: jest.fn() },
      processoMembro: { findFirst: jest.fn() },
      prazo: { findFirst: jest.fn() },
    },
  };

  function buildUseCase() {
    return new GetLegalCaseUseCase(prisma as never);
  }

  beforeEach(() => jest.clearAllMocks());

  it('esconde processo em segredo de justiça de quem não tem case:read:confidential (404, nunca 403)', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(buildProcesso({ segredoJustica: true }));

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      buildUser(['case:read:all']),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('mostra o processo em segredo de justiça para quem tem case:read:confidential', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(buildProcesso({ segredoJustica: true }));
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      usuario: { nome: 'Ana', avatarUrl: null },
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      buildUser(['case:read:all', 'case:read:confidential']),
    );

    expect(result.ok).toBe(true);
  });

  it('retorna NOT_FOUND quando o usuário não tem nenhuma permissão case:read:*', async () => {
    const result = await buildUseCase().execute('escritorio-1', 'processo-1', buildUser([]));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.processo.findFirst).not.toHaveBeenCalled();
  });

  it('escopo ASSIGNED: esconde processo de outro responsável fora da equipe do processo', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(
      buildProcesso({ responsavelPrincipalId: 'membro-2' }),
    );
    prisma.client.processoMembro.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      buildUser(['case:read:assigned'], 'membro-1'),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('escopo ASSIGNED: mostra processo quando o usuário está na equipe do processo mesmo não sendo o responsável', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(
      buildProcesso({ responsavelPrincipalId: 'membro-2' }),
    );
    prisma.client.processoMembro.findFirst.mockResolvedValue({ id: 'vinculo-1' });
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      usuario: { nome: 'Bia', avatarUrl: null },
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      buildUser(['case:read:assigned'], 'membro-1'),
    );

    expect(result.ok).toBe(true);
  });

  it('escopo ALL vê qualquer processo não confidencial, sem checagem adicional', async () => {
    prisma.client.processo.findFirst.mockResolvedValue(
      buildProcesso({ responsavelPrincipalId: 'membro-9' }),
    );
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-9',
      usuario: { nome: 'Caio', avatarUrl: null },
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'processo-1',
      buildUser(['case:read:all'], 'membro-1'),
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.processoMembro.findFirst).not.toHaveBeenCalled();
  });
});
