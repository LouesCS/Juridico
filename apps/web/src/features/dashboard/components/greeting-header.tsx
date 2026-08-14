'use client';

import Link from 'next/link';
import { Scale, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth';
import { useActiveOffice } from '@/features/office';
import { usePermission } from '@/hooks/use-permission';

/**
 * Real — `useCurrentUser()` (`GET /me`) + `useActiveOffice()` (store,
 * populado pelo Office Context). Atalhos linkam só para rotas que
 * realmente existem nesta rodada (`/processos`, `/clientes` são stubs
 * reais de navegação; `/admin/usuarios` é o Team real) — nenhum link para
 * `/processos/novo`/`/clientes/novo`, que não existem ainda.
 */
export function GreetingHeader() {
  const { data: user, isLoading } = useCurrentUser();
  const office = useActiveOffice();
  const canInvite = usePermission('member:invite');

  if (isLoading) {
    return (
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold">Olá, {user?.usuario.nome}</h1>
        {office && <p className="text-sm text-muted-foreground">{office.nome}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/processos">
            <Scale className="size-4" aria-hidden="true" />
            Processos
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/clientes">
            <Users className="size-4" aria-hidden="true" />
            Clientes
          </Link>
        </Button>
        {canInvite && (
          <Button size="sm" asChild>
            <Link href="/admin/usuarios">
              <UserPlus className="size-4" aria-hidden="true" />
              Convidar equipe
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
