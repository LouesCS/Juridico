'use client';

import { useCurrentUser } from '@/features/auth';
import { hasAnyPermission, hasPermission } from '@/lib/permissions/has-permission';

/**
 * Reafirma docs/frontend/06-autorizacao.md §6.3 — nenhuma chamada de rede,
 * lê só o array já carregado por `useCurrentUser()` (`GET /me`).
 */
export function usePermission(required: string): boolean {
  const { data } = useCurrentUser();
  return hasPermission(data?.membro.permissions ?? [], required);
}

export function useAnyPermission(required: string[]): boolean {
  const { data } = useCurrentUser();
  return hasAnyPermission(data?.membro.permissions ?? [], required);
}

/**
 * Array bruto de permissões do usuário atual — usado por
 * `components/layout/sidebar-content.tsx` para filtrar grupos inteiros
 * (não só itens individuais) sem violar docs/frontend/01-arquitetura.md
 * §1.4 (`components/` não pode importar `features/` diretamente; `hooks/`
 * pode).
 */
export function useCurrentPermissions(): string[] {
  const { data } = useCurrentUser();
  return data?.membro.permissions ?? [];
}
