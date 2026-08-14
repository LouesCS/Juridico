/**
 * Núcleo do Permission Engine (Prompt 12) — checagem pura de permissão,
 * espelha `apps/web/src/lib/permissions/has-permission.ts` (mesma regra:
 * `recurso:acao:escopo` também satisfeito por `recurso:acao:all`). Antes
 * desta rodada, cada controller/use case fazia `permissions.includes(...)`
 * inline (`PermissionGuard`, `ClientContextBuilder`, os 9 adapters de
 * busca, ...) — nenhuma duplicação nova a partir de agora deve reimplementar
 * esta regra; sempre importar daqui.
 */
export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes(required)) return true;
  const segments = required.split(':');
  if (segments.length === 3) {
    const [resource, action] = segments;
    return permissions.includes(`${resource}:${action}:all`);
  }
  return false;
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((permission) => hasPermission(permissions, permission));
}

export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every((permission) => hasPermission(permissions, permission));
}
