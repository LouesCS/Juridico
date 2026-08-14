/**
 * Canal de eventos entre o cliente HTTP (que detecta 401/revogação) e a
 * feature de auth (que decide o que fazer — limpar cache, redirecionar).
 * Evita import circular entre `lib/api/client.ts` (infraestrutura) e
 * `features/auth` (domínio) — reafirma a regra de fronteira de
 * docs/frontend/01-arquitetura.md §1.4 (lib/ nunca importa features/).
 */
export const authEvents = new EventTarget();

export const AUTH_SESSION_REVOKED_EVENT = 'session-revoked';

export function emitSessionRevoked() {
  authEvents.dispatchEvent(new Event(AUTH_SESSION_REVOKED_EVENT));
}
