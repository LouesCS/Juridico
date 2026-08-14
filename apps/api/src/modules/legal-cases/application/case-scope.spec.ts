import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
} from './case-scope';

describe('resolveCaseReadScope', () => {
  it('resolve ALL quando o usuário possui case:read:all, mesmo tendo outros escopos', () => {
    expect(resolveCaseReadScope(['case:read:all', 'case:read:assigned'])).toBe('ALL');
  });

  it('resolve TEAM quando não tem ALL mas tem TEAM', () => {
    expect(resolveCaseReadScope(['case:read:team', 'case:read:assigned'])).toBe('TEAM');
  });

  it('resolve ASSIGNED quando só tem o escopo mínimo', () => {
    expect(resolveCaseReadScope(['case:read:assigned'])).toBe('ASSIGNED');
  });

  it('retorna null quando o usuário não tem nenhum escopo de leitura de processo', () => {
    expect(resolveCaseReadScope(['client:read'])).toBeNull();
  });
});

describe('buildCaseScopeWhere', () => {
  const actor = { membroId: 'membro-1', teamMemberIds: ['membro-2', 'membro-3'] };

  it('ALL não aplica nenhum filtro adicional', () => {
    expect(buildCaseScopeWhere('ALL', actor)).toEqual({});
  });

  it('ASSIGNED filtra por responsável principal ou presença na equipe do processo', () => {
    expect(buildCaseScopeWhere('ASSIGNED', actor)).toEqual({
      OR: [{ responsavelPrincipalId: 'membro-1' }, { equipe: { some: { membroId: 'membro-1' } } }],
    });
  });

  it('TEAM amplia o filtro para incluir os colegas da mesma Equipe', () => {
    expect(buildCaseScopeWhere('TEAM', actor)).toEqual({
      OR: [
        { responsavelPrincipalId: { in: ['membro-1', 'membro-2', 'membro-3'] } },
        { equipe: { some: { membroId: 'membro-1' } } },
      ],
    });
  });
});

describe('applyConfidentialityFilter', () => {
  it('sem case:read:confidential, esconde processos em segredo de justiça', () => {
    expect(applyConfidentialityFilter(['case:read:all'])).toEqual({ segredoJustica: false });
  });

  it('com case:read:confidential, não filtra nada', () => {
    expect(applyConfidentialityFilter(['case:read:all', 'case:read:confidential'])).toEqual({});
  });
});
