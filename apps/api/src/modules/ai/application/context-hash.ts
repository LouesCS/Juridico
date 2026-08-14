import { createHash } from 'node:crypto';

/**
 * SHA-256 usado tanto para `hashFonte` (detectar se uma fonte citada mudou
 * depois da geração) quanto `hashContexto` (chave de cache — reafirma
 * docs/database/06-entidades-ia-notificacoes-auditoria.md §6.1.2: "hashContexto
 * igual entre uma solicitação nova e a linha vigente → retorna a vigente sem
 * chamar o provedor de IA novamente").
 */
export function hashContent(value: unknown): string {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(serialized).digest('hex');
}
