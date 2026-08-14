'use client';

import { useOfficeStore, type OfficeSummary, type OfficeStatus } from '@/stores/office.store';

/**
 * Reafirma docs/frontend/07-office-context.md §7.1 — leitura pura do
 * espelho em `stores/office.store.ts`, nenhuma chamada de rede.
 */
export function useOffice(): {
  status: OfficeStatus;
  escritorioAtivoId: string | null;
  escritorios: OfficeSummary[];
} {
  const status = useOfficeStore((s) => s.status);
  const escritorioAtivoId = useOfficeStore((s) => s.escritorioAtivoId);
  const escritorios = useOfficeStore((s) => s.escritorios);
  return { status, escritorioAtivoId, escritorios };
}

/**
 * Equivalente ao `useCurrentOffice()` nomeado em
 * docs/frontend/10-tanstack-query.md §10.2 — nome alinhado ao pedido
 * explícito desta etapa (`useActiveOffice`), mesma responsabilidade.
 */
export function useActiveOffice(): OfficeSummary | null {
  return useOfficeStore((s) => s.escritorios.find((o) => o.id === s.escritorioAtivoId) ?? null);
}
