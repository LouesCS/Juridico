import { GetCollaboratorUseCase } from './get-collaborator.use-case';

function buildPrisma() {
  return {
    client: {
      membro: { findFirst: jest.fn() },
      convite: { findFirst: jest.fn() },
    },
  };
}

describe('GetCollaboratorUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna NOT_FOUND quando o colaborador não existe no escritório', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue(null);

    const result = await new GetCollaboratorUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-x',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('computa situacaoAcesso=convite_pendente para colaborador sem usuarioId com convite PENDENTE', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      nome: 'Ana',
      status: 'ATIVO',
      usuarioId: null,
      usuario: null,
      papel: { id: 'papel-1', nome: 'ADVOGADO' },
      cargoCatalogo: null,
      gruposColaboradores: [],
      responsavel: null,
    });
    prisma.client.convite.findFirst.mockResolvedValue({ id: 'convite-1' });

    const result = await new GetCollaboratorUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.situacaoAcesso).toBe('convite_pendente');
      expect(result.value.temAcesso).toBe(false);
    }
  });

  it('inclui cargo/grupos/responsável formatados quando presentes', async () => {
    const prisma = buildPrisma();
    prisma.client.membro.findFirst.mockResolvedValue({
      id: 'membro-1',
      nome: 'Ana',
      status: 'ATIVO',
      usuarioId: 'usuario-1',
      usuario: { status: 'ATIVO' },
      papel: { id: 'papel-1', nome: 'ADVOGADO' },
      cargoCatalogo: { id: 'cargo-1', nome: 'Advogado Sênior' },
      gruposColaboradores: [{ grupo: { id: 'grupo-1', nome: 'Trabalhista' } }],
      responsavel: { id: 'membro-resp', nome: 'Carlos' },
    });
    prisma.client.convite.findFirst.mockResolvedValue(null);

    const result = await new GetCollaboratorUseCase(prisma as never).execute(
      'escritorio-1',
      'membro-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cargo).toEqual({ id: 'cargo-1', nome: 'Advogado Sênior' });
      expect(result.value.grupos).toEqual([{ id: 'grupo-1', nome: 'Trabalhista' }]);
      expect(result.value.responsavel).toEqual({ id: 'membro-resp', nome: 'Carlos' });
      expect(result.value.situacaoAcesso).toBe('desbloqueado');
    }
  });
});
