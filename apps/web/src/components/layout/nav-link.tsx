'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAnyPermission } from '@/hooks/use-permission';
import type { NavItem } from '@/config/navigation';

/**
 * Reafirma docs/frontend/06-autorizacao.md §6.3 — item ausente (não
 * renderizado), nunca acinzentado, quando o usuário não tem nenhuma das
 * `anyOfPermissions`. Ausência do campo = sempre visível.
 */
export function NavLink({
  item,
  onNavigate,
  collapsed = false,
}: {
  item: NavItem;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const allowed = useAnyPermission(item.anyOfPermissions ?? []);
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

  if (item.anyOfPermissions && !allowed) return null;

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-sidebar-accent text-foreground shadow-elevation-1'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
      )}
    >
      {isActive && (
        <span
          className="transition-fade-in absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
    </Link>
  );
}
