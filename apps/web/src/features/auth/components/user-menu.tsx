'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { env } from '@/config/env';
import { useCurrentUser } from '../api/queries';
import { useLogout } from '../api/mutations';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Menu de usuário da Topbar — reafirma docs/frontend/03-rotas.md §3.4
 * (overlay sem URL própria). Feature-owned (precisa de `useCurrentUser`/
 * `useLogout`), injetado em `AppShell` via prop a partir de
 * `app/(app)/layout.tsx` — mesma composição do `WorkspaceSwitcher`.
 */
export function UserMenu() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: async () => {
        // Ponte exclusiva do modo demonstração — contraparte de
        // `api/demo/login`, ver LoginForm.tsx. Sem efeito fora dele.
        if (env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
          await fetch('/api/demo/logout', { method: 'POST' }).catch(() => undefined);
        }
        router.push('/login');
      },
    });
  }

  if (isLoading) return <Skeleton className="size-8 rounded-full" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Menu do usuário"
      >
        <Avatar>
          {user?.usuario.avatarUrl && <AvatarImage src={user.usuario.avatarUrl} alt="" />}
          <AvatarFallback>
            {user ? initials(user.usuario.nome) : <UserCircle className="size-4" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-medium">{user?.usuario.nome}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.usuario.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} disabled={logout.isPending}>
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
