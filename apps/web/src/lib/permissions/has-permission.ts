/**
 * Reafirma docs/frontend/06-autorizacao.md §6.3 — comparação client-side
 * idêntica à do backend: `recurso:acao:escopo` também satisfeito por
 * `recurso:acao:all` (mesma regra de docs/api/03-autorizacao.md §3.8).
 * Chaves reais vêm de `apps/api/prisma/seed.ts` — algumas são
 * `recurso:acao` sem sufixo de escopo (escopo `ALL` implícito, ex.:
 * `office:update`), outras `recurso:acao:escopo` explícito só quando a
 * ação tem variantes por escopo (ex.: `case:read:all|team|assigned`).
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes(required)) return true;
  const segments = required.split(':');
  if (segments.length === 3) {
    const [resource, action] = segments;
    return userPermissions.includes(`${resource}:${action}:all`);
  }
  return false;
}

export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((permission) => hasPermission(userPermissions, permission));
}
