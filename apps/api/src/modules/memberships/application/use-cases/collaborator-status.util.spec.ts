import { computeSituacaoAcesso } from './collaborator-status.util';

describe('computeSituacaoAcesso', () => {
  it('retorna inativo quando membro.status === INATIVO, independente de usuarioId/usuario', () => {
    expect(
      computeSituacaoAcesso(
        { status: 'INATIVO', usuarioId: 'u1', usuario: { status: 'ATIVO' } },
        false,
      ),
    ).toBe('inativo');
  });

  it('retorna suspenso quando membro.status === SUSPENSO, com prioridade sobre o status do Usuario', () => {
    expect(
      computeSituacaoAcesso(
        { status: 'SUSPENSO', usuarioId: 'u1', usuario: { status: 'BLOQUEADO' } },
        false,
      ),
    ).toBe('suspenso');
  });

  it('retorna sem_acesso quando não há usuarioId nem convite pendente', () => {
    expect(computeSituacaoAcesso({ status: 'ATIVO', usuarioId: null }, false)).toBe('sem_acesso');
  });

  it('retorna convite_pendente quando não há usuarioId mas existe convite PENDENTE', () => {
    expect(computeSituacaoAcesso({ status: 'ATIVO', usuarioId: null }, true)).toBe(
      'convite_pendente',
    );
  });

  it('retorna bloqueado quando há usuarioId e o Usuario está BLOQUEADO', () => {
    expect(
      computeSituacaoAcesso(
        { status: 'ATIVO', usuarioId: 'u1', usuario: { status: 'BLOQUEADO' } },
        false,
      ),
    ).toBe('bloqueado');
  });

  it('retorna desbloqueado quando há usuarioId e o Usuario não está BLOQUEADO', () => {
    expect(
      computeSituacaoAcesso(
        { status: 'ATIVO', usuarioId: 'u1', usuario: { status: 'ATIVO' } },
        false,
      ),
    ).toBe('desbloqueado');
  });
});
