export function centsToDecimal(value: string | null | undefined): string {
  return value == null
    ? ''
    : `${BigInt(value) / 100n}.${(BigInt(value) % 100n).toString().padStart(2, '0')}`;
}
export function decimalToCents(value: string): string | null {
  const raw = value.trim().replace(/R\$\s?/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) throw new Error('Valor monetário inválido.');
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}
export function formatBRLCurrency(value: string | null): string {
  return value === null
    ? '--'
    : (Number(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
