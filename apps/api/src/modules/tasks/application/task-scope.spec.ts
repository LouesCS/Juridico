import { buildTaskScopeWhere, resolveTaskReadScope } from './task-scope';

describe('resolveTaskReadScope', () => {
  it('resolve ALL > TEAM > ASSIGNED', () => {
    expect(resolveTaskReadScope(['task:read:all'])).toBe('ALL');
    expect(resolveTaskReadScope(['task:read:team'])).toBe('TEAM');
    expect(resolveTaskReadScope(['task:read:assigned'])).toBe('ASSIGNED');
    expect(resolveTaskReadScope(['task:read:all', 'task:read:assigned'])).toBe('ALL');
  });

  it('retorna null sem nenhuma permissão de leitura', () => {
    expect(resolveTaskReadScope([])).toBeNull();
    expect(resolveTaskReadScope(['task:create'])).toBeNull();
  });
});

describe('buildTaskScopeWhere', () => {
  const actor = { membroId: 'm1', teamMemberIds: ['m2', 'm3'], equipeId: 'equipe-1' };

  it('ALL não filtra nada', () => {
    expect(buildTaskScopeWhere('ALL', actor)).toEqual({});
  });

  it('ASSIGNED filtra por responsável principal ou auxiliar', () => {
    expect(buildTaskScopeWhere('ASSIGNED', actor)).toEqual({
      OR: [
        { responsavelPrincipalId: 'm1' },
        { responsaveisAuxiliares: { some: { membroId: 'm1' } } },
      ],
    });
  });

  it('TEAM inclui responsável (próprio+equipe) e a equipe da tarefa', () => {
    expect(buildTaskScopeWhere('TEAM', actor)).toEqual({
      OR: [
        { responsavelPrincipalId: { in: ['m1', 'm2', 'm3'] } },
        { responsaveisAuxiliares: { some: { membroId: { in: ['m1', 'm2', 'm3'] } } } },
        { equipeId: 'equipe-1' },
      ],
    });
  });

  it('TEAM sem equipe própria não inclui a cláusula de equipeId', () => {
    const semEquipe = { membroId: 'm1', teamMemberIds: [], equipeId: null };
    expect(buildTaskScopeWhere('TEAM', semEquipe)).toEqual({
      OR: [
        { responsavelPrincipalId: { in: ['m1'] } },
        { responsaveisAuxiliares: { some: { membroId: { in: ['m1'] } } } },
      ],
    });
  });
});
