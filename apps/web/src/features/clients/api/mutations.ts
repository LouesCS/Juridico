'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { clientsApi, type UpsertClientInput } from './clients.api';
import { clientsKeys } from './keys';

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: UpsertClientInput) => clientsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
    },
  });
}

export function useUpdateClient(clientId: string) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (input: UpsertClientInput) => clientsApi.update(clientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: clientsKeys.detail(escritorioAtivoId ?? '', clientId),
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.remove(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.archive(clientId),
    onSuccess: (_data, clientId) => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: clientsKeys.detail(escritorioAtivoId ?? '', clientId),
      });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.restore(clientId),
    onSuccess: (_data, clientId) => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: clientsKeys.detail(escritorioAtivoId ?? '', clientId),
      });
    },
  });
}

export function useDuplicateClient() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.duplicate(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
    },
  });
}

export function useToggleClientFavorite() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.toggleFavorite(clientId),
    onSuccess: (_data, clientId) => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists(escritorioAtivoId ?? '') });
      queryClient.invalidateQueries({
        queryKey: clientsKeys.detail(escritorioAtivoId ?? '', clientId),
      });
    },
  });
}
