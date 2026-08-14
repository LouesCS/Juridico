import { isValidCnpj, isValidCpf } from './br-documents';

describe('isValidCpf', () => {
  it('aceita um CPF com dígitos verificadores corretos', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('aceita a mesma sequência com máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCpf('52998224700')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('rejeita tamanho diferente de 11 dígitos', () => {
    expect(isValidCpf('123')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('aceita um CNPJ com dígitos verificadores corretos', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('aceita a mesma sequência com máscara', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCnpj('11222333000199')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('rejeita tamanho diferente de 14 dígitos', () => {
    expect(isValidCnpj('123')).toBe(false);
  });
});
