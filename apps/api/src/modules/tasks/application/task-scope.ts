import { Prisma } from '@prisma/client';

/**
 * Resolve o escopo efetivo de `task:read:*` a partir da lista de
 * permissões já resolvida no login — mesmo padrão de `case-scope.ts`
 * (Prompt 7), reaproveitado literalmente, nunca duplicado com lógica
 * própria. ALL > TEAM > ASSIGNED — o escopo mais amplo que o usuário
 * possuir vence.
 */
export type TaskReadScope = 'ALL' | 'TEAM' | 'ASSIGNED';

export function resolveTaskReadScope(permissions: string[]): TaskReadScope | null {
  if (permissions.includes('task:read:all')) return 'ALL';
  if (permissions.includes('task:read:team')) return 'TEAM';
  if (permissions.includes('task:read:assigned')) return 'ASSIGNED';
  return null;
}

export interface TaskScopeActor {
  membroId: string;
  /** IDs dos membros da mesma `Equipe` do ator — ver nota em `case-scope.ts`. */
  teamMemberIds: string[];
  /** `Equipe` (Memberships) do próprio ator, se houver — `Tarefa.equipeId` é coluna solta (sem FK). */
  equipeId: string | null;
}

/**
 * Monta a cláusula `where` do Prisma para o escopo resolvido. TEAM inclui
 * ASSIGNED. Responsável principal, responsáveis auxiliares e a `Tarefa.
 * equipeId` igual à equipe do próprio ator contam como "atribuída".
 */
export function buildTaskScopeWhere(
  scope: TaskReadScope,
  actor: TaskScopeActor,
): Prisma.TarefaWhereInput {
  if (scope === 'ALL') return {};

  if (scope === 'TEAM') {
    return {
      OR: [
        { responsavelPrincipalId: { in: [actor.membroId, ...actor.teamMemberIds] } },
        {
          responsaveisAuxiliares: {
            some: { membroId: { in: [actor.membroId, ...actor.teamMemberIds] } },
          },
        },
        ...(actor.equipeId ? [{ equipeId: actor.equipeId }] : []),
      ],
    };
  }

  return {
    OR: [
      { responsavelPrincipalId: actor.membroId },
      { responsaveisAuxiliares: { some: { membroId: actor.membroId } } },
    ],
  };
}
