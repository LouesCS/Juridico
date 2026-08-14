'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { searchApi, type SearchResultType } from './search.api';
import { searchKeys } from './keys';

/**
 * Reafirma docs/frontend/21-search.md §21.2 — `staleTime` curto (resultado
 * de busca muda rápido, mas reabrir a MESMA busca na mesma sessão não deve
 * refazer o round-trip) + `keepPreviousData` (resultado anterior some
 * esmaecido, nunca limpa para spinner — reafirma docs/ux/09-busca-global.md
 * §9.13/§9.14). `AbortSignal` do TanStack Query cancela buscas antigas
 * automaticamente quando o termo muda antes da resposta anterior chegar.
 */
export function useUniversalSearch(q: string, types?: SearchResultType[], limit = 8) {
  const { escritorioAtivoId } = useOffice();
  const trimmed = q.trim();
  return useQuery({
    queryKey: searchKeys.results(escritorioAtivoId ?? '', trimmed, types),
    queryFn: ({ signal }) => searchApi.search(trimmed, { types, limit, signal }),
    enabled: !!escritorioAtivoId && trimmed.length >= 2,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  });
}

export function useSearchSuggestions(enabled: boolean) {
  const { escritorioAtivoId } = useOffice();
  return useQuery({
    queryKey: searchKeys.suggestions(escritorioAtivoId ?? ''),
    queryFn: () => searchApi.suggestions(),
    enabled: !!escritorioAtivoId && enabled,
    staleTime: 60_000,
  });
}
