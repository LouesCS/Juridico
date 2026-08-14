/**
 * Número CNJ (Resolução CNJ 65/2008, Anexo V): NNNNNNN-DD.AAAA.J.TR.OOOO —
 * 7 dígitos sequenciais, 2 dígitos verificadores, ano, segmento de justiça,
 * tribunal, origem. O dígito verificador é calculado em módulo 97 sobre os
 * 18 dígitos restantes (sequencial+ano+segmento+tribunal+origem), reafirma
 * docs/api/09-legal-cases.md (`422` para dígito verificador inválido).
 */

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
