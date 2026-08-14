'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

/**
 * `sonner` já implementa `aria-live` corretamente por tipo de toast
 * (docs/ux/15-acessibilidade.md) — reafirma docs/frontend/13-design-system.md §13.4.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      visibleToasts={3}
      closeButton
    />
  );
}
