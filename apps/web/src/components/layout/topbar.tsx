'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Search, Bell, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui.store';
import { useCommandPaletteStore } from '@/stores/command-palette.store';

/**
 * Busca global (Sprint 10) — o campo não é mais um `<input>` real: é um
 * botão com aparência de campo de busca que abre o Command Palette
 * (`features/search`), mesmo padrão Raycast/Spotlight/Linear (clicar na
 * "barra de busca" abre um overlay, não digita inline na Topbar). `Ctrl+K`/
 * `⌘K` abre de qualquer lugar via `useCommandPaletteShortcut` (registrado
 * dentro do próprio `CommandPalette`, montado uma vez em `(app)/layout.tsx`).
 */
export function Topbar({
  onOpenMobileNav,
  userMenu,
}: {
  onOpenMobileNav: () => void;
  userMenu: React.ReactNode;
}) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 shadow-elevation-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegação"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="size-5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-5" aria-hidden="true" />
        )}
      </Button>

      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Abrir busca global"
        className="relative flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">Buscar processos, clientes, documentos…</span>
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <Button variant="ghost" size="icon" asChild aria-label="Notificações">
        <Link href="/notificacoes">
          <Bell className="size-5" aria-hidden="true" />
        </Link>
      </Button>

      {userMenu}
    </header>
  );
}
