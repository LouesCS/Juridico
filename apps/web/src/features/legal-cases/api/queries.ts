'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { legalCasesApi, type ListLegalCasesParams } from './legal-cases.api';
import { legalCasesKeys } from './keys';

export function useLegalCases(params: ListLegalCasesParams = {}) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: legalCasesKeys.list(escritorioAtivoId ?? '', params),
    queryFn: () => legalCasesApi.list(params),
    enabled: !!escritorioAtivoId,
    placeholderData: (previous) => previous,
  });
}

export function useLegalCase(caseId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
    queryFn: () => legalCasesApi.get(caseId),
    enabled: !!escritorioAtivoId && !!caseId,
  });
}

export function useCaseTeam(caseId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: legalCasesKeys.team(escritorioAtivoId ?? '', caseId),
    queryFn: () => legalCasesApi.listTeam(caseId),
    enabled: !!escritorioAtivoId && !!caseId,
  });
}

export function useCaseParties(caseId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: legalCasesKeys.parties(escritorioAtivoId ?? '', caseId),
    queryFn: () => legalCasesApi.listParties(caseId),
    enabled: !!escritorioAtivoId && !!caseId,
  });
}

export function useCaseDeadlines(caseId: string) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: legalCasesKeys.deadlines(escritorioAtivoId ?? '', caseId),
    queryFn: () => legalCasesApi.listDeadlines(caseId),
    enabled: !!escritorioAtivoId && !!caseId,
  });
}
