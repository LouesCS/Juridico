import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy } from '@/lib/security/csp';

/**
 * Reafirma docs/frontend/04-app-router.md §4.4: só checagem RÁPIDA de
 * presença do cookie `access_token` (não validação de assinatura/expiração
 * — isso é sempre responsabilidade do backend, reafirma
 * docs/frontend/05-autenticacao.md §5.2). Middleware nunca decide
 * autorização fina, nunca faz refresh de token (side effect de escrita não
 * cabe em middleware do Next.js de forma segura/idempotente).
 */
const PUBLIC_PATHS = [
  '/login',
  '/registro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/convite',
  '/auth/callback',
  // Ponte exclusiva do modo demonstração (docs/frontend-implementation/
  // 19-decisions.md) — precisa ser alcançável ANTES do cookie existir,
  // já que é ela quem o grava; responde 404 fora do modo mock (ver
  // app/api/demo/login/route.ts), então não abre nenhuma rota real.
  '/api/demo',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * CSP gerada aqui — e SÓ aqui — reafirma
 * docs/frontend-implementation/19-decisions.md §19.17: antes também
 * definida (de forma estática e diferente) em `next.config.ts`, o que
 * fazia o navegador combinar duas políticas ao mesmo tempo. `next.config.ts
 * headers()` não tem acesso a um nonce novo por requisição, então a CSP
 * com nonce só pode viver no middleware.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const nonce = crypto.randomUUID();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
    storageUrl: process.env.NEXT_PUBLIC_STORAGE_URL ?? '',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  if (isPublicPath(pathname)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const hasSession = request.cookies.has('access_token');
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return withCsp(NextResponse.redirect(loginUrl));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    /*
     * Roda em toda rota exceto assets estáticos e a própria infraestrutura
     * do Next.js — reafirma docs/frontend/04-app-router.md §4.4.
     */
    '/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js).*)',
  ],
};
