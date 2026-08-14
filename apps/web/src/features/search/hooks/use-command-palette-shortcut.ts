'use client';

import * as React from 'react';
import { useCommandPaletteStore } from '@/stores/command-palette.store';

/**
 * Registra `Ctrl+K`/`⌘K` globalmente — reafirma docs/ux/09-busca-global.md
 * §9.2. `Esc` fecha via o próprio `Dialog` (Radix), não precisa de handler
 * dedicado aqui. Ignora o atalho dentro de campos de edição de texto livre
 * (`textarea`/`contenteditable`) para não capturar `Ctrl+K` de um editor de
 * texto rico no futuro — inputs/selects comuns continuam abrindo a busca.
 */
export function useCommandPaletteShortcut() {
  const toggle = useCommandPaletteStore((s) => s.toggle);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'TEXTAREA') return;

      event.preventDefault();
      toggle();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);
}
