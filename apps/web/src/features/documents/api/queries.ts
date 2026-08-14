'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { documentsApi, type ListDocumentsParams } from './documents.api';
import { documentsKeys } from './keys';

export function useDocuments(params: ListDocumentsParams = {}, enabled = true) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: documentsKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => documentsApi.list(params),
    enabled: !!escritorioAtivoId && enabled,
    placeholderData: (previous) => previous,
  });
}

export function useDocument(id: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: documentsKeys.detail(escritorioAtivoId ?? '', id),
    queryFn: () => documentsApi.get(id),
    enabled: !!escritorioAtivoId && !!id,
  });
}

export function useDocumentVersions(id: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: documentsKeys.versions(escritorioAtivoId ?? '', id),
    queryFn: () => documentsApi.listVersions(id),
    enabled: !!escritorioAtivoId && !!id,
  });
}

export function useDocumentsDashboardSummary() {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: documentsKeys.dashboardSummary(escritorioAtivoId ?? ''),
    queryFn: () => documentsApi.dashboardSummary(),
    enabled: !!escritorioAtivoId,
  });
}
