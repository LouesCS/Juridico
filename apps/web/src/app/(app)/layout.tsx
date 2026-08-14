import { AppShell } from '@/components/layout/app-shell';
import { UserMenu } from '@/features/auth';
import { WorkspaceSwitcher } from '@/features/office';
import { CommandPalette } from '@/features/search';
import { OfficeProvider } from '@/providers/office-provider';
import { OfficeGate } from './_components/office-gate';

/**
 * App Shell real — reafirma docs/frontend/02-estrutura-pastas.md §2.1
 * (`(app)/layout.tsx`) e docs/frontend-implementation/06-shell-navigation.md.
 * Server Component puro (composição, zero lógica) — `OfficeProvider`,
 * `OfficeGate`, `WorkspaceSwitcher` e `UserMenu` são os únicos filhos que
 * precisam de estado/hooks client-side.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfficeProvider>
      <OfficeGate>
        <AppShell workspaceSwitcher={<WorkspaceSwitcher />} userMenu={<UserMenu />}>
          {children}
        </AppShell>
        <CommandPalette />
      </OfficeGate>
    </OfficeProvider>
  );
}
