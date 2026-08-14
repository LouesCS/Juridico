'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import {
  documentsApi,
  type MoveDocumentInput,
  type PresignVersionInput,
  type UpdateDocumentInput,
} from './documents.api';
import { documentsKeys } from './keys';

function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: documentsKeys.all(escritorioAtivoId ?? '') });
    if (id) queryClient.invalidateQueries({ queryKey: documentsKeys.detail(escritorioAtivoId ?? '', id) });
  };
}

export function useUpdateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDocumentInput }) => documentsApi.update(id, input),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => documentsApi.restore(id),
    onSuccess: () => invalidate(),
  });
}

export function useDuplicateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => documentsApi.duplicate(id),
    onSuccess: () => invalidate(),
  });
}

export function useMoveDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveDocumentInput }) => documentsApi.move(id, input),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useToggleDocumentFavorite() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => documentsApi.toggleFavorite(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function usePresignVersion() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PresignVersionInput }) =>
      documentsApi.presignVersion(id, input),
  });
}

export function useConfirmVersion() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({
      id,
      versionToken,
      hashSha256,
      comentarioVersao,
    }: {
      id: string;
      versionToken: string;
      hashSha256: string;
      comentarioVersao?: string;
    }) => documentsApi.confirmVersion(id, versionToken, hashSha256, comentarioVersao),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}
