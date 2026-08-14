import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from './csp';

const base = { nonce: 'test-nonce-123', apiUrl: 'http://localhost:3000/api/v1', storageUrl: '' };

describe('buildContentSecurityPolicy', () => {
  it('desenvolvimento inclui unsafe-eval (exigido pelo Fast Refresh do webpack)', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: true });
    expect(csp).toContain("'unsafe-eval'");
  });

  it('desenvolvimento inclui unsafe-inline para script (scripts injetados pelo Next.js dev)', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: true });
    const scriptDirective = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(scriptDirective).toContain("'unsafe-inline'");
  });

  it('produção NÃO inclui unsafe-eval', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: false });
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('produção NÃO inclui unsafe-inline em script-src — usa nonce + strict-dynamic', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: false });
    const scriptDirective = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(scriptDirective).toContain(`'nonce-${base.nonce}'`);
    expect(scriptDirective).toContain("'strict-dynamic'");
  });

  it('desenvolvimento: connect-src permite WebSocket/HMR', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: true });
    const connectDirective = csp.split('; ').find((d) => d.startsWith('connect-src'))!;
    expect(connectDirective).toContain('ws:');
    expect(connectDirective).toContain('wss:');
  });

  it('produção: connect-src NÃO adiciona o fallback de localhost/WebSocket do dev, mesmo se apiUrl real usar outro host', () => {
    const csp = buildContentSecurityPolicy({
      ...base,
      isDev: false,
      apiUrl: 'https://api.quilombodev.com.br/v1',
    });
    const connectDirective = csp.split('; ').find((d) => d.startsWith('connect-src'))!;
    expect(connectDirective).not.toContain('localhost');
    expect(connectDirective).not.toContain('ws:');
    expect(connectDirective).not.toContain('wss:');
  });

  it('produção: connect-src inclui a API real configurada', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: false });
    expect(csp).toContain(base.apiUrl);
  });

  it('cada chamada usa o nonce recebido — nunca um valor fixo', () => {
    const cspA = buildContentSecurityPolicy({ ...base, isDev: false, nonce: 'nonce-a' });
    const cspB = buildContentSecurityPolicy({ ...base, isDev: false, nonce: 'nonce-b' });
    expect(cspA).toContain("'nonce-nonce-a'");
    expect(cspB).toContain("'nonce-nonce-b'");
    expect(cspA).not.toContain('nonce-b');
  });

  it('frame-src usa o storageUrl quando presente, "none" quando ausente', () => {
    const withStorage = buildContentSecurityPolicy({ ...base, isDev: false, storageUrl: 'https://storage.example.com' });
    const withoutStorage = buildContentSecurityPolicy({ ...base, isDev: false, storageUrl: '' });
    expect(withStorage).toContain('frame-src https://storage.example.com');
    expect(withoutStorage).toContain("frame-src 'none'");
  });

  it('diretivas de segurança fixas permanecem em qualquer ambiente', () => {
    for (const isDev of [true, false]) {
      const csp = buildContentSecurityPolicy({ ...base, isDev });
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("default-src 'self'");
    }
  });
});
