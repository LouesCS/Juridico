import { z } from 'zod';
import { GROUP_ORDER, SearchResultType } from '../../domain/search-types';

/** Reafirma docs/api/15-search.md §15.1 — `q` mín. 2 caracteres, `limit` por grupo (padrão 8, máximo 20). */
export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(2, 'Digite ao menos 2 caracteres.').max(200),
    types: z.string().trim().max(500).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(8),
  })
  .strict();
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** `types=case-scope,documents` (csv) → apenas os grupos válidos, na ordem fixa de `GROUP_ORDER`. Token desconhecido é ignorado, nunca erro 422 — busca degrada normalmente. */
export function parseRequestedTypes(types: string | undefined): SearchResultType[] {
  if (!types) return GROUP_ORDER;
  const requested = new Set(types.split(',').map((t) => t.trim()));
  const filtered = GROUP_ORDER.filter((t) => requested.has(t));
  return filtered.length > 0 ? filtered : GROUP_ORDER;
}
