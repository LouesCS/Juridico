import type { SearchResultType } from '../api/search.api';

/**
 * Reafirma docs/frontend/21-search.md §21.3 — prefixos (`p:`/`d:`/`c:`) e `>`
 * (ações) são interpretados NO CLIENTE antes de montar a query string
 * (`types` param); nunca enviados literalmente ao backend.
 */
const PREFIX_MAP: Array<[string, SearchResultType]> = [
  ['p:', 'legal-cases'],
  ['d:', 'documents'],
  ['c:', 'clients'],
  ['t:', 'tasks'],
];

export interface ParsedQuery {
  scope: SearchResultType | null;
  actionsOnly: boolean;
  rest: string;
}

export function parsePrefixedQuery(raw: string): ParsedQuery {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('>')) {
    return { scope: null, actionsOnly: true, rest: trimmed.slice(1).trimStart() };
  }
  const lower = trimmed.toLowerCase();
  for (const [prefix, scope] of PREFIX_MAP) {
    if (lower.startsWith(prefix)) {
      return { scope, actionsOnly: false, rest: trimmed.slice(prefix.length).trimStart() };
    }
  }
  return { scope: null, actionsOnly: false, rest: trimmed };
}
