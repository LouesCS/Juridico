'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { documentsKeys } from '@/features/documents/api/keys';
import { foldersApi, type CreateFolderInput, type UpdateFolderInput } from './folders.api';
import { foldersKeys } from './keys';

function useInvalidateFolders() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return () => {
    queryClient.invalidateQueries({ queryKey: foldersKeys.all(escritorioAtivoId ?? '') });
    queryClient.invalidateQueries({ queryKey: documentsKeys.all(escritorioAtivoId ?? '') });
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => foldersApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) => foldersApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useReorderFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, ordem }: { id: string; ordem: number }) => foldersApi.reorder(id, ordem),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, cascata }: { id: string; cascata?: boolean }) => foldersApi.remove(id, cascata),
    onSuccess: invalidate,
  });
}

export function useRestoreFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (id: string) => foldersApi.restore(id),
    onSuccess: invalidate,
  });
}

export function useToggleFolderFavorite() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (id: string) => foldersApi.toggleFavorite(id),
    onSuccess: invalidate,
  });
}
