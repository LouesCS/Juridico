/**
 * Reafirma docs/api/15-search.md §15.4 — histórico dos últimos 10 termos
 * digitados (distinto de "recentes", que são itens abertos). Puramente
 * client-side; `DELETE /v1/search/history` documentado na API não existe
 * nesta rodada (a própria doc resolve isso como operação local no MVP).
 */
const STORAGE_KEY = 'quilombo-search-history';
const MAX_TERMS = 10;

function readAll(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSearchHistory(): string[] {
  return readAll();
}

export function pushSearchTerm(term: string): void {
  if (typeof window === 'undefined') return;
  const normalizado = term.trim();
  if (normalizado.length < 2) return;
  const semDuplicata = readAll().filter((t) => t.toLowerCase() !== normalizado.toLowerCase());
  const atualizado = [normalizado, ...semDuplicata].slice(0, MAX_TERMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizado));
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
