const SENSITIVE_KEY_PATTERN =
  /senha|password|token|refresh|cookie|secret|segredo|codigoRecuperacao|recoveryCode/i;

/**
 * Remove recursivamente qualquer chave que combine com dado sensível antes
 * de gravar em `LogAuditoria.dadosAntes`/`dadosDepois` — reafirma
 * PROMPT 5C Etapa 1 ("dados sensíveis não podem ser registrados").
 * Nunca lança; entrada que não é objeto plano é devolvida como está.
 */
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 5) return '[profundidade máxima atingida]';

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForAudit(item, depth + 1));
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = '[redacted]';
        continue;
      }
      sanitized[key] = sanitizeForAudit(val, depth + 1);
    }
    return sanitized;
  }

  return value;
}
