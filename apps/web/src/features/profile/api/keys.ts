/**
 * `sessions` é dado de conta do usuário, não de escritório/tenant — mesma
 * exceção já registrada para `authKeys.me()` (docs/frontend-implementation/
 * 19-decisions.md §19.3): não escopado por `officeId` porque não varia
 * por escritório ativo.
 */
export const profileKeys = {
  sessions: () => ['profile', 'sessions'] as const,
};
