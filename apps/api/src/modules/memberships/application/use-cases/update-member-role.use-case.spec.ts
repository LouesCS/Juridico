import { UpdateMemberRoleUseCase } from './update-member-role.use-case';

describe('UpdateMemberRoleUseCase', () => {
  const prisma = {
    client: {
      membro: {
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      papel: {
        findFirst: jest.fn(),
      },
    },
  };

  function buildUseCase() {
    return new UpdateMemberRoleUseCase(prisma as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Papel válido por padrão em todo teste — os testes de auto-escalonamento
    // nem chegam a checar isso (retornam antes), e os demais testam outro
    // comportamento; a validação de papel cross-tenant tem seus próprios
    // testes dedicados abaixo.
    prisma.client.papel.findFirst.mockResolvedValue({ id: 'papel-novo' });
  });

  it('impede auto-escalonamento (ator === alvo)', async () => {
    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-1',
      'papel-novo',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SELF_ESCALATION_FORBIDDEN');
    expect(prisma.client.membro.findFirst).not.toHaveBeenCalled();
  });

  it('retorna NOT_FOUND quando o papel alvo não é de sistema nem pertence a este escritório (achado real — cross-tenant)', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      papel: { nome: 'ADVOGADO' },
    });
    prisma.client.papel.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-2',
      'papel-de-outro-escritorio',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.papel.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'papel-de-outro-escritorio',
        OR: [{ ehSistema: true }, { escritorioId: 'escritorio-1' }],
      },
    });
    expect(prisma.client.membro.update).not.toHaveBeenCalled();
  });

  it('impede remover o último OWNER ativo alterando seu papel', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      papel: { nome: 'OWNER' },
    });
    prisma.client.membro.count.mockResolvedValue(0); // nenhum outro OWNER ativo

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-2',
      'papel-advogado',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LAST_OWNER');
    expect(prisma.client.membro.update).not.toHaveBeenCalled();
  });

  it('permite alterar papel de OWNER quando existe outro OWNER ativo', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      papel: { nome: 'OWNER' },
    });
    prisma.client.membro.count.mockResolvedValue(1); // existe outro OWNER

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-2',
      'papel-advogado',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.membro.update).toHaveBeenCalledWith({
      where: { id: 'membro-2' },
      data: { papelId: 'papel-advogado' },
    });
  });

  it('permite alterar papel de membro que não é OWNER sem checagem adicional', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      papel: { nome: 'ADVOGADO' },
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-2',
      'papel-socio',
    );

    expect(result.ok).toBe(true);
    expect(prisma.client.membro.count).not.toHaveBeenCalled();
  });

  it('permite atribuir um papel customizado do mesmo escritório', async () => {
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-2',
      papel: { nome: 'ADVOGADO' },
    });

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-2',
      'papel-customizado-1',
    );

    expect(result.ok).toBe(true);
  });

  it('retorna NOT_FOUND quando o membro alvo não existe no escritório', async () => {
    prisma.client.membro.findFirst.mockResolvedValue(null);

    const result = await buildUseCase().execute(
      'escritorio-1',
      'membro-1',
      'membro-inexistente',
      'papel-x',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    expect(prisma.client.papel.findFirst).not.toHaveBeenCalled();
  });
});
