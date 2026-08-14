'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/stores/ui.store';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from './sidebar-content';
import { SimulationBanner } from './simulation-banner';
import { Topbar } from './topbar';

/**
 * Reafirma docs/frontend/02-estrutura-pastas.md (`components/layout/`) —
 * shell puro, sem conhecimento de `features/*`: `workspaceSwitcher` e
 * `userMenu` chegam prontos via prop, compostos em
 * `app/(app)/layout.tsx` (a única camada que pode importar features
 * livremente). Mantém a regra de fronteira de
 * docs/frontend/01-arquitetura.md §1.4 sem exceção.
 */
export function AppShell({
  workspaceSwitcher,
  userMenu,
  children,
}: {
  workspaceSwitcher: React.ReactNode;
  userMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'hidden shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar-background p-3 transition-[width] duration-200 ease-in-out lg:block',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarContent workspaceSwitcher={workspaceSwitcher} collapsed={sidebarCollapsed} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-3 lg:hidden">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent
            workspaceSwitcher={workspaceSwitcher}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <SimulationBanner />
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} userMenu={userMenu} />
        <main id="main-content" className="scrollbar-fade flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
