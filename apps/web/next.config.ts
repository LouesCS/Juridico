import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança reafirmam docs/frontend/25-security.md §25.2/§25.8.
 *
 * `Content-Security-Policy` NÃO é definida aqui — decisão registrada em
 * docs/frontend-implementation/19-decisions.md §19.17: precisa de um
 * nonce novo a cada requisição (produção) e de uma regra condicionada a
 * `NODE_ENV` (desenvolvimento precisa de `unsafe-eval`/`unsafe-inline`
 * para o Fast Refresh do Next.js) — `headers()` abaixo é estático,
 * resolvido uma vez no build, sem acesso a nada disso. A CSP real vive
 * em `middleware.ts` (`buildContentSecurityPolicy`, `lib/security/csp.ts`),
 * a única fonte deste header. Tê-la nos dois lugares ao mesmo tempo faz o
 * navegador aplicar a interseção de duas políticas — foi exatamente isso
 * que quebrou a hidratação do React em `next dev` nesta rodada.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Necessário para o Dockerfile de produção (copia só o output mínimo,
  // sem node_modules completo) — reafirma docs/frontend-implementation/20-docker-ci.md.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
