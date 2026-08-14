import { Prisma } from '@prisma/client';

/**
 * Resolve o escopo efetivo de `case:read:*` a partir da lista de permissões
 * já resolvida no login (reafirma docs/api/03-autorizacao.md §3.8 e
 * `PermissionGuard`, que só garante a etapa 1/ação — este helper é a etapa
 * 2/recurso, aplicada como filtro de query, nunca pós-processamento, per
 * docs/api/09-legal-cases.md §9.1). ALL > TEAM > ASSIGNED — o escopo mais
 * amplo que o usuário possuir vence.
 */
export type CaseReadScope = 'ALL' | 'TEAM' | 'ASSIGNED';

export function resolveCaseReadScope(permissions: string[]): CaseReadScope | null {
  if (permissions.includes('case:read:all')) return 'ALL';
  if (permissions.includes('case:read:team')) return 'TEAM';
  if (permissions.includes('case:read:assigned')) return 'ASSIGNED';
  return null;
}

export interface ScopeActor {
  membroId: string;
  /**
   * IDs dos membros da mesma `Equipe` do ator (já resolvidos pelo use case
   * via `prisma.membro.findMany`) — `Processo.responsavelPrincipalId` é uma
   * coluna solta, sem relação Prisma para `Membro` (módulos desacoplados),
   * então esse cálculo não pode ser expresso como filtro relacional direto.
   */
  teamMemberIds: string[];
}

/**
 * Monta a cláusula `where` do Prisma para o escopo resolvido. TEAM inclui
 * ASSIGNED (um processo do próprio membro sempre é visível dentro da
 * própria equipe). Segredo de justiça é filtrado à parte por
 * `applyConfidentialityFilter` — os dois filtros são independentes e
 * ambos aplicados na mesma query.
 */
export function buildCaseScopeWhere(
  scope: CaseReadScope,
  actor: ScopeActor,
): Prisma.ProcessoWhereInput {
  if (scope === 'ALL') return {};

  if (scope === 'TEAM') {
    return {
      OR: [
        { responsavelPrincipalId: { in: [actor.membroId, ...actor.teamMemberIds] } },
        { equipe: { some: { membroId: actor.membroId } } },
      ],
    };
  }

  return {
    OR: [
      { responsavelPrincipalId: actor.membroId },
      { equipe: { some: { membroId: actor.membroId } } },
    ],
  };
}

/** Reafirma docs/api/09-legal-cases.md §9.1 — segredo de justiça exige `case:read:confidential`. */
export function applyConfidentialityFilter(permissions: string[]): Prisma.ProcessoWhereInput {
  if (permissions.includes('case:read:confidential')) return {};
  return { segredoJustica: false };
}
