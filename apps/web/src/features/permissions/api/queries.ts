'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { permissionsApi } from './permissions.api';
import { permissionsKeys } from './keys';

export function usePermissionCatalog(enabled: boolean) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: permissionsKeys.catalog(escritorioAtivoId ?? ''),
    queryFn: () => permissionsApi.listCatalog(),
    enabled: !!escritorioAtivoId && enabled,
    staleTime: 5 * 60_000, // catálogo muda raramente — mesmo racional de useRoles()
  });
}

export function useRoleDetail(id: string | null, enabled: boolean) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: permissionsKeys.role(escritorioAtivoId ?? '', id ?? ''),
    queryFn: () => permissionsApi.getRole(id!),
    enabled: !!escritorioAtivoId && !!id && enabled,
  });
}
