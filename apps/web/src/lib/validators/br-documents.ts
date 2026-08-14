/**
 * Mesmo algoritmo de `apps/api/src/shared/domain/validators/br-documents.ts`
 * — duplicado no frontend para validação client-side imediata (sem round
 * trip); o backend continua a fonte de verdade (nenhum monorepo compartilha
 * pacote entre `apps/api`/`apps/web` nesta rodada, mesma limitação de
 * docs/frontend-implementation/19-decisions.md §19.2 sobre tipos manuais).
 */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isAllSameDigit(digits: string): boolean {
  return digits.split('').every((d) => d === digits[0]);
}

function calcCheckDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || isAllSameDigit(digits)) return false;
  const dv1 = calcCheckDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calcCheckDigit(digits.slice(0, 9) + dv1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === digits.slice(0, 9) + dv1.toString() + dv2.toString();
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || isAllSameDigit(digits)) return false;
  const dv1 = calcCheckDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calcCheckDigit(digits.slice(0, 12) + dv1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === digits.slice(0, 12) + dv1.toString() + dv2.toString();
}

export { onlyDigits };
