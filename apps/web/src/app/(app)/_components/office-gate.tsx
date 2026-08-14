'use client';

import { useOffice } from '@/features/office';
import { NoOfficeState } from './no-office-state';

/**
 * Só o layout autenticado (`app/(app)/`) importa `features/office`
 * diretamente — `components/layout/app-shell.tsx` nunca conhece domínio
 * (docs/frontend/01-arquitetura.md §1.4). `status === 'idle'` (antes de
 * `GET /me` resolver) deixa passar normalmente: cada página já mostra seu
 * próprio skeleton via `useCurrentUser().isLoading`, o gate não deve
 * bloquear a árvore inteira enquanto carrega.
 */
export function OfficeGate({ children }: { children: React.ReactNode }) {
  const { status } = useOffice();
  if (status === 'no-office') return <NoOfficeState />;
  return <>{children}</>;
}
