'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSwitchOffice } from '../api/mutations';
import { useOffice } from '../hooks/use-office';

/**
 * Reafirma docs/frontend/07-office-context.md §7.2/§7.6 — sem dropdown
 * (só o nome como texto) quando o usuário tem um único escritório
 * conhecido nesta sessão. Lista vem de `useOffice()` (já em memória via
 * `stores/office.store.ts`), nenhuma chamada de rede para abrir o menu.
 */
export function WorkspaceSwitcher() {
  const router = useRouter();
  const { escritorioAtivoId, escritorios } = useOffice();
  const switchOffice = useSwitchOffice();

  const active = escritorios.find((o) => o.id === escritorioAtivoId);

  if (escritorios.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-sidebar-foreground">
        <Building2 className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{active?.nome ?? 'Escritório'}</span>
      </div>
    );
  }

  function handleSelect(escritorioId: string) {
    if (escritorioId === escritorioAtivoId) return;
    switchOffice.mutate(
      { escritorioId },
      {
        onSuccess: () => router.push('/'),
        onError: (error) => {
          if (isApiError(error) && error.status === 403) {
            toast.error('Você não pertence mais a este escritório.');
            return;
          }
          toast.error('Não foi possível trocar de escritório. Tente novamente.');
        },
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        disabled={switchOffice.isPending}
        aria-label="Trocar de escritório"
      >
        <Building2 className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">{active?.nome ?? 'Selecionar escritório'}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Seus escritórios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {escritorios.map((office) => (
          <DropdownMenuItem key={office.id} onSelect={() => handleSelect(office.id)}>
            <span className="flex-1 truncate">{office.nome}</span>
            {office.id === escritorioAtivoId && <Check className="size-4 shrink-0" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
