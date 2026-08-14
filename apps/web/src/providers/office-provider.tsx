'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import { openOfficeChannel, type OfficeSwitchedMessage } from '@/lib/broadcast/office-channel';
import { useOfficeStore } from '@/stores/office.store';

/**
 * Mantém `stores/office.store.ts` sincronizado com `GET /me` (§7.1) e ouve
 * a troca de escritório disparada em outra aba (§7.3 passo e — reafirma
 * `docs/frontend/07-office-context.md`). Montado uma vez no layout
 * autenticado (`app/(app)/layout.tsx`), dentro do `QueryProvider`.
 */
export function OfficeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const hydrateFromMe = useOfficeStore((s) => s.hydrateFromMe);
  const setActive = useOfficeStore((s) => s.setActive);

  React.useEffect(() => {
    if (!user) return;
    hydrateFromMe(user.escritorio, user.membro.papel);
  }, [user, hydrateFromMe]);

  React.useEffect(() => {
    const channel = openOfficeChannel();
    if (!channel) return;

    function handleMessage(event: MessageEvent<OfficeSwitchedMessage>) {
      if (event.data.type !== 'office-switched') return;
      // (a)-(d) do fluxo de §7.3 — nunca (f): esta aba não navega sozinha,
      // decisão explícita do documento ("outras abas também fazem (a) a (d)").
      queryClient.clear();
      setActive(event.data.escritorioId);
      // Reabertura de SSE: pendente, nenhuma conexão existe ainda nesta rodada.
    }

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [queryClient, setActive]);

  return <>{children}</>;
}
