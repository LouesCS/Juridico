import type { SearchResultType } from '../api/search.api';

/**
 * Reafirma docs/frontend/21-search.md §21.4 — "Recentes" (últimos 5 itens
 * abertos, qualquer tipo) vive só no cliente (`localStorage`), nunca
 * sincronizado ao servidor. Não escopado por `officeId` deliberadamente
 * (mesma decisão documentada: mostrar um atalho de um escritório anterior é
 * um problema de UX menor — o clique cai no fluxo padrão de 404 — não um
 * vazamento de dado sensível).
 */
export interface RecentItem {
  id: string;
  tipo: SearchResultType;
  titulo: string;
  subtitulo: string | null;
  url: string;
  abertoEm: string;
}

const STORAGE_KEY = 'quilombo-search-recent-items';
const MAX_ITEMS = 5;

function readAll(): RecentItem[] {
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

export function getRecentItems(): RecentItem[] {
  return readAll();
}

export function pushRecentItem(item: Omit<RecentItem, 'abertoEm'>): void {
  if (typeof window === 'undefined') return;
  const semDuplicata = readAll().filter((i) => i.id !== item.id || i.tipo !== item.tipo);
  const atualizado = [{ ...item, abertoEm: new Date().toISOString() }, ...semDuplicata].slice(
    0,
    MAX_ITEMS,
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizado));
}

export function clearRecentItems(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
