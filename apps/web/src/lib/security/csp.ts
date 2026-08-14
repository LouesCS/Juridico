export interface BuildCspOptions {
  /** Único por requisição — nunca reaproveitado entre requests. */
  nonce: string;
  isDev: boolean;
  apiUrl: string;
  storageUrl: string;
}

/**
 * Reafirma docs/frontend/25-security.md §25.2/§25.8 e
 * docs/frontend-implementation/19-decisions.md §19.17 — gerada por
 * requisição (`middleware.ts`, único lugar que define este header; ver
 * decisão registrada sobre por que não também em `next.config.ts`).
 *
 * `script-src` é a única diretiva que muda por ambiente:
 * - **Desenvolvimento**: `next dev` usa `eval()` no devtool de source map
 *   do webpack (Fast Refresh) e injeta scripts inline (hidratação,
 *   HMR runtime) — sem `'unsafe-eval'`/`'unsafe-inline'` o React nunca
 *   hidrata, e todo formulário cai no submit HTML nativo (é exatamente o
 *   bug relatado). Nenhum destes dois tokens é usado em produção.
 * - **Produção**: `'nonce-<valor>'` + `'strict-dynamic'` — o padrão
 *   oficial do Next.js App Router (script confia só em quem o nonce já
 *   validou), nunca `'unsafe-eval'`, nunca `'unsafe-inline'` para script.
 *
 * `connect-src` em desenvolvimento também precisa admitir o WebSocket do
 * Fast Refresh (`ws:`/`wss:`, mesma origem em qualquer porta local).
 */
export function buildContentSecurityPolicy({
  nonce,
  isDev,
  apiUrl,
  storageUrl,
}: BuildCspOptions): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const connectSrc = isDev
    ? `connect-src 'self' ${apiUrl} ws: wss: http://localhost:* ws://localhost:*`.trim()
    : `connect-src 'self' ${apiUrl}`.trim();

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    connectSrc,
    `frame-src ${storageUrl || "'none'"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
