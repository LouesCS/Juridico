import { createHash } from 'crypto';

/**
 * SHA-256 do token — nunca o valor em claro persistido. Reafirma
 * docs/database/03-entidades-identidade-escritorios.md §3.3 (refresh token)
 * e §3.6.1 (token de convite/recuperação de senha).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
