/**
 * Sincronização de troca de escritório entre abas — reafirma
 * docs/frontend/07-office-context.md §7.3 passo (e): a aba que trocou
 * publica, as demais executam (a) `queryClient.clear()` a (d) reabertura de
 * conexões dependentes, mas **não** o redirecionamento (f) — cada aba
 * decide sozinha se a rota atual ainda faz sentido, reafirma o texto exato
 * do documento ("outras abas também fazem (a) a (d)", não (f)).
 *
 * `BroadcastChannel` não existe em todo ambiente (SSR, navegadores muito
 * antigos) — todas as funções abaixo toleram `undefined` sem lançar.
 */
export interface OfficeSwitchedMessage {
  type: 'office-switched';
  escritorioId: string;
}

const CHANNEL_NAME = 'quilombo-office';

export function openOfficeChannel(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function postOfficeSwitched(
  channel: BroadcastChannel | undefined,
  escritorioId: string,
): void {
  channel?.postMessage({ type: 'office-switched', escritorioId } satisfies OfficeSwitchedMessage);
}
