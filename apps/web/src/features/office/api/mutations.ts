'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api/errors';
import { openOfficeChannel, postOfficeSwitched } from '@/lib/broadcast/office-channel';
import { useOfficeStore } from '@/stores/office.store';
import { officeApi } from './office.api';

/**
 * Reafirma a sequência exata de docs/frontend/07-office-context.md §7.3:
 * (a) `queryClient.clear()` inteiro — nunca invalidação seletiva (§7.4);
 * (b) atualiza o store com o novo escritório ativo;
 * (e) publica no `BroadcastChannel` para as outras abas replicarem (a)-(d).
 * (c) invalidação de `['me']` é redundante aqui — `clear()` já a remove, o
 * próximo componente que monta refaz o fetch naturalmente.
 * (d) reabertura de SSE: pendente — nenhuma conexão SSE existe ainda nesta
 * rodada (ver docs/frontend-implementation/19-decisions.md).
 * (f) redirecionamento para `/`: responsabilidade do componente chamador
 * (mesmo padrão de `useLogin`/`useLogout` em `features/auth/api/mutations.ts`
 * — este módulo não importa `next/navigation`).
 *
 * Falha (403 `FORBIDDEN` — vínculo removido entre carregar a lista e
 * clicar): remove o escritório da lista local sem nova chamada de rede,
 * permanece no escritório atual (§7.3 passo 4). O toast de erro é
 * responsabilidade do componente chamador (`WorkspaceSwitcher`), que tem
 * acesso ao texto certo para o contexto.
 */
export function useSwitchOffice() {
  const queryClient = useQueryClient();
  const setActive = useOfficeStore((s) => s.setActive);
  const removeOffice = useOfficeStore((s) => s.removeOffice);

  return useMutation({
    mutationFn: officeApi.switchOffice,
    onSuccess: (_data, variables) => {
      queryClient.clear();
      setActive(variables.escritorioId);
      const channel = openOfficeChannel();
      postOfficeSwitched(channel, variables.escritorioId);
      channel?.close();
    },
    onError: (error, variables) => {
      if (isApiError(error) && error.status === 403) {
        removeOffice(variables.escritorioId);
      }
    },
  });
}
