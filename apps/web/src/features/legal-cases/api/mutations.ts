'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import {
  legalCasesApi,
  type ExtrajudicialAggregateInput,
  type JudicialAggregateInput,
  type UpsertLegalCaseInput,
} from './legal-cases.api';
import { legalCasesKeys } from './keys';

export function useCreateLegalCase() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: UpsertLegalCaseInput) => legalCasesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') });
    },
  });
}

export function useUpdateLegalCase(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ versaoAtual, input }: { versaoAtual: number; input: UpsertLegalCaseInput }) =>
      legalCasesApi.update(caseId, versaoAtual, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useUpdateExtrajudicialAggregate(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({
      versaoAtual,
      input,
    }: {
      versaoAtual: number;
      input: ExtrajudicialAggregateInput;
    }) => legalCasesApi.updateExtrajudicial(caseId, versaoAtual, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') }),
        queryClient.invalidateQueries({
          queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: legalCasesKeys.parties(escritorioAtivoId ?? '', caseId),
        }),
      ]),
  });
}

export function useUpdateJudicialAggregate(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ versaoAtual, input }: { versaoAtual: number; input: JudicialAggregateInput }) =>
      legalCasesApi.updateJudicial(caseId, versaoAtual, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') }),
        queryClient.invalidateQueries({
          queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: legalCasesKeys.parties(escritorioAtivoId ?? '', caseId),
        }),
      ]),
  });
}

function useCaseLifecycleMutation(caseId: string, fn: (id: string) => Promise<void>) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: () => fn(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalCasesKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useDeleteLegalCase(caseId: string) {
  return useCaseLifecycleMutation(caseId, legalCasesApi.remove);
}

export function useArchiveLegalCase(caseId: string) {
  return useCaseLifecycleMutation(caseId, legalCasesApi.archive);
}

export function useRestoreLegalCase(caseId: string) {
  return useCaseLifecycleMutation(caseId, legalCasesApi.restore);
}

export function useAddCaseTeamMember(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (membroId: string) => legalCasesApi.addTeamMember(caseId, membroId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.team(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useChangeCaseResponsible(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (membroId: string) => legalCasesApi.changeResponsible(caseId, membroId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.team(escritorioAtivoId ?? '', caseId),
      });
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.detail(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useRemoveCaseTeamMember(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (membroId: string) => legalCasesApi.removeTeamMember(caseId, membroId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.team(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useRemoveCaseParty(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (parteId: string) => legalCasesApi.removeParty(caseId, parteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.parties(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}

export function useUpdateCaseParty(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: ({ parteId, principal }: { parteId: string; principal: boolean }) =>
      legalCasesApi.updateParty(caseId, parteId, { principal }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.parties(escritorioAtivoId ?? '', caseId),
      }),
  });
}

export function useCreateCaseDeadline(caseId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: {
      titulo: string;
      tipo: string;
      dataVencimento: string;
      responsavelId: string;
      prioridade?: string;
    }) => legalCasesApi.createDeadline(caseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: legalCasesKeys.deadlines(escritorioAtivoId ?? '', caseId),
      });
    },
  });
}
