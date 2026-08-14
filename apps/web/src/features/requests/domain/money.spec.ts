import { describe, expect, it } from 'vitest';
import { centsToDecimal, decimalToCents, formatBRLCurrency } from './money';
describe('conversão monetária de Pedidos', () => {
  it.each([
    ['0.01', '1'],
    ['1.00', '100'],
    ['10.99', '1099'],
    ['1234.56', '123456'],
    ['81213.14', '8121314'],
    ['999999999.99', '99999999999'],
  ])('%s ↔ %s sem perda', (decimal, cents) => {
    expect(decimalToCents(decimal)).toBe(cents);
    expect(centsToDecimal(cents)).toBe(decimal);
  });
  it('aceita moeda brasileira com separador de milhar', () =>
    expect(decimalToCents('R$ 81.213,14')).toBe('8121314'));
  it('trata vazio e zero distintamente', () => {
    expect(decimalToCents('')).toBeNull();
    expect(decimalToCents('0')).toBe('0');
  });
  it.each(['-1', 'texto', '1.234'])('rejeita valor inválido %s', (value) =>
    expect(() => decimalToCents(value)).toThrow(),
  );
  it('formata centavos em BRL', () => expect(formatBRLCurrency('8121314')).toContain('81.213,14'));
});
