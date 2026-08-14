'use client';

import * as React from 'react';
import { navGroups, secondaryNavItems, type NavGroup } from '@/config/navigation';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/data-display/scroll-area';
import { useCurrentPermissions } from '@/hooks/use-permission';
import { hasAnyPermission } from '@/lib/permissions/has-permission';
import { NavLink } from './nav-link';

/**
 * Conteúdo da navegação, compartilhado entre a Sidebar fixa (desktop) e o
 * drawer (`Sheet`, mobile) — reafirma docs/frontend/02-estrutura-pastas.md
 * (`components/layout/`). Não conhece `features/*` diretamente: recebe o
 * `WorkspaceSwitcher` já pronto via prop (composição feita em
 * `app/(app)/layout.tsx`, que pode importar features/*).
 *
 * Prompt 11 (Reorganização da Navegação): a lista plana virou grupos
 * temáticos (`navGroups`) com cabeçalho (PESSOAS, JURÍDICO, ...). Um grupo
 * cujos itens estão todos ocultos por permissão (ex.: CONFIGURAÇÕES para
 * quem não é OWNER/ADMIN) não deixa cabeçalho órfão — filtrado aqui, antes
 * do render, usando o mesmo array de permissões que `NavLink` já consulta
 * individualmente via `useAnyPermission`.
 */
export function SidebarContent({
  workspaceSwitcher,
  onNavigate,
  collapsed = false,
}: {
  workspaceSwitcher: React.ReactNode;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const permissions = useCurrentPermissions();

  const visibleGroups: NavGroup[] = navGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => !item.anyOfPermissions || hasAnyPermission(permissions, item.anyOfPermissions)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Colapsada: seletor de escritório escondido (ver
          docs/frontend-implementation/19-decisions.md §19.9) — nav por ícone
          continua acessível, expandir a sidebar reexpõe o seletor. */}
      {!collapsed && <div>{workspaceSwitcher}</div>}
      <Separator />
      <ScrollArea orientation="vertical" className="min-h-0 flex-1 -mr-1 pr-1">
        <nav aria-label="Navegação principal" className="flex flex-col gap-5">
          {visibleGroups.map((group, index) => (
            <div key={group.label ?? `grupo-${index}`}>
              {group.label && !collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} onNavigate={onNavigate} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <Separator />
      <nav aria-label="Navegação secundária" className="flex flex-col gap-1">
        {secondaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} collapsed={collapsed} />
        ))}
      </nav>
    </div>
  );
}
