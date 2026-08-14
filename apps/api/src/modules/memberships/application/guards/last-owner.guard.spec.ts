import { assertNotLastActiveOwner } from './last-owner.guard';

function buildPrisma() {
  return { client: { membro: { count: jest.fn() } } };
}

describe('assertNotLastActiveOwner', () => {
  it('não checa nada (nem dispara count) quando o alvo não é OWNER', async () => {
    const prisma = buildPrisma();

    const erro = await assertNotLastActiveOwner(
      prisma as never,
      'escritorio-1',
      'membro-1',
      'ADVOGADO',
    );

    expect(erro).toBeNull();
    expect(prisma.client.membro.count).not.toHaveBeenCalled();
  });

  it('retorna LAST_OWNER quando o alvo é OWNER e não há outro OWNER ativo', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.count.mockResolvedValue(0);

    const erro = await assertNotLastActiveOwner(
      prisma as never,
      'escritorio-1',
      'membro-1',
      'OWNER',
    );

    expect(erro).not.toBeNull();
    expect(erro?.code).toBe('LAST_OWNER');
    expect(prisma.client.membro.count).toHaveBeenCalledWith({
      where: {
        escritorioId: 'escritorio-1',
        status: 'ATIVO',
        papel: { nome: 'OWNER' },
        id: { not: 'membro-1' },
      },
    });
  });

  it('retorna null quando o alvo é OWNER mas existe outro OWNER ativo', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.count.mockResolvedValue(1);

    const erro = await assertNotLastActiveOwner(
      prisma as never,
      'escritorio-1',
      'membro-1',
      'OWNER',
    );

    expect(erro).toBeNull();
  });
});
