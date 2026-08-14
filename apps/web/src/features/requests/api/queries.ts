'use client';
import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { requestsApi, type RequestQuery } from './requests.api';
export const requestKeys = {
  all: (o: string) => ['office', o, 'requests'] as const,
  list: (o: string, q: RequestQuery) => [...requestKeys.all(o), 'list', q] as const,
  detail: (o: string, id: string) => [...requestKeys.all(o), 'detail', id] as const,
};
export function useRequests(q: RequestQuery) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: requestKeys.list(escritorioAtivoId ?? '', q),
    queryFn: () => requestsApi.list(q),
    enabled: !!escritorioAtivoId,
    placeholderData: (p) => p,
  });
}
export function useRequest(id: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: requestKeys.detail(escritorioAtivoId ?? '', id),
    queryFn: () => requestsApi.get(id),
    enabled: !!escritorioAtivoId && !!id,
  });
}
