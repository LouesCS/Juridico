/** Mesmo algoritmo de `apps/api/src/modules/legal-cases/domain/cnj.ts` — ver nota em br-documents.ts. */

export function normalizeCnj(numero: string): string {
  return numero.replace(/\D/g, '');
}

export function isValidCnj(numero: string): boolean {
  const digits = normalizeCnj(numero);
  if (digits.length !== 20) return false;

  const sequencial = digits.slice(0, 7);
  const dvInformado = digits.slice(7, 9);
  const ano = digits.slice(9, 13);
  const segmento = digits.slice(13, 14);
  const tribunal = digits.slice(14, 16);
  const origem = digits.slice(16, 20);

  const base = BigInt(sequencial + ano + segmento + tribunal + origem);
  const resto = (base * 100n) % 97n;
  const dvCalculado = (98n - resto).toString().padStart(2, '0');

  return dvInformado === dvCalculado;
}

export function formatCnj(numero: string): string {
  const digits = normalizeCnj(numero);
  if (digits.length !== 20) return numero;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}
