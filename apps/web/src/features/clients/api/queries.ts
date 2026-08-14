'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { clientsApi, type ListClientsParams } from './clients.api';
import { clientsKeys } from './keys';

export function useClients(params: ListClientsParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: clientsKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => clientsApi.list(params),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}

export function useClient(clientId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: clientsKeys.detail(escritorioAtivoId ?? '', clientId),
    queryFn: () => clientsApi.get(clientId),
    enabled: !!escritorioAtivoId && !!clientId,
  });
}

export function useClientLegalCases(clientId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: clientsKeys.legalCases(escritorioAtivoId ?? '', clientId),
    queryFn: () => clientsApi.listLegalCases(clientId),
    enabled: !!escritorioAtivoId && !!clientId,
  });
}

export function useClientTimeline(clientId: string, params: { tipo?: string; q?: string; cursor?: string; limit?: number } = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: clientsKeys.timeline(escritorioAtivoId ?? '', clientId, params),
    queryFn: () => clientsApi.listTimeline(clientId, params),
    enabled: !!escritorioAtivoId && !!clientId,
  });
}
