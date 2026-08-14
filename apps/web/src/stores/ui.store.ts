import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Reafirma docs/frontend/11-estado-global.md §11.2 — só preferência visual
 * (colapso da Sidebar), nunca dado de servidor ou sensível. Único store
 * desta rodada com `persist` em `localStorage` (os demais, como
 * `office.store.ts`, são deliberadamente não persistidos — ver §7.7).
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: 'quilombo-ui' },
  ),
);
