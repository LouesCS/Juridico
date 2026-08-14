import { create } from 'zustand';

/**
 * Reafirma docs/frontend/11-estado-global.md §11.4 — estado de aberto/
 * fechado do Command Palette (`⌘K`/`Ctrl+K`), montado uma única vez em
 * `(app)/layout.tsx` e nunca remontado por rota (preserva histórico de
 * termos/escopo durante a navegação). Não persistido — abrir de novo depois
 * de recarregar a página deve sempre começar fechado.
 */
interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
