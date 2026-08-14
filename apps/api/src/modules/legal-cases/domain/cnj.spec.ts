import { formatCnj, isValidCnj, normalizeCnj } from './cnj';

describe('cnj', () => {
  const valido = '12345671920248260001'; // 1234567-19.2024.8.26.0001

  it('aceita um número CNJ com dígito verificador correto', () => {
    expect(isValidCnj(valido)).toBe(true);
  });

  it('aceita o número já formatado com máscara', () => {
    expect(isValidCnj('1234567-19.2024.8.26.0001')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCnj('12345670020248260001')).toBe(false);
  });

  it('rejeita string com tamanho diferente de 20 dígitos', () => {
    expect(isValidCnj('123')).toBe(false);
    expect(isValidCnj('')).toBe(false);
  });

  it('normaliza removendo qualquer caractere não numérico', () => {
    expect(normalizeCnj('1234567-19.2024.8.26.0001')).toBe(valido);
  });

  it('formata 20 dígitos crus na máscara oficial', () => {
    expect(formatCnj(valido)).toBe('1234567-19.2024.8.26.0001');
  });

  it('devolve o valor original quando não tem 20 dígitos (não decide validade)', () => {
    expect(formatCnj('123')).toBe('123');
  });
});
