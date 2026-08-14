import { sanitizeForAudit } from './sanitize-for-audit';

describe('sanitizeForAudit', () => {
  it('redige chaves sensíveis conhecidas', () => {
    const result = sanitizeForAudit({
      email: 'a@b.com',
      senha: 'plaintext',
      senhaHash: 'hash',
      refreshToken: 'rt',
      accessToken: 'at',
      cookie: 'c',
      secret: 's',
      tokenConvite: 't',
    }) as Record<string, unknown>;

    expect(result.email).toBe('a@b.com');
    expect(result.senha).toBe('[redacted]');
    expect(result.senhaHash).toBe('[redacted]');
    expect(result.refreshToken).toBe('[redacted]');
    expect(result.accessToken).toBe('[redacted]');
    expect(result.cookie).toBe('[redacted]');
    expect(result.secret).toBe('[redacted]');
    expect(result.tokenConvite).toBe('[redacted]');
  });

  it('redige recursivamente em objetos e arrays aninhados', () => {
    const result = sanitizeForAudit({
      usuario: { nome: 'Ana', senha: 'x' },
      sessoes: [{ refreshToken: 'rt1' }, { refreshToken: 'rt2' }],
    }) as { usuario: { senha: string }; sessoes: Array<{ refreshToken: string }> };

    expect(result.usuario.senha).toBe('[redacted]');
    expect(result.sessoes[0].refreshToken).toBe('[redacted]');
    expect(result.sessoes[1].refreshToken).toBe('[redacted]');
  });

  it('não lança para valores primitivos, null ou undefined', () => {
    expect(sanitizeForAudit(null)).toBeNull();
    expect(sanitizeForAudit(undefined)).toBeUndefined();
    expect(sanitizeForAudit('texto')).toBe('texto');
    expect(sanitizeForAudit(42)).toBe(42);
  });

  it('converte Date para ISO string', () => {
    const date = new Date('2026-07-31T00:00:00.000Z');
    expect(sanitizeForAudit(date)).toBe('2026-07-31T00:00:00.000Z');
  });
});
