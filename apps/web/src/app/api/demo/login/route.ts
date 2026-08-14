import { NextResponse } from 'next/server';

/**
 * Ponte EXCLUSIVA do modo demonstração — reafirma
 * docs/frontend-implementation/19-decisions.md (decisão registrada nesta
 * rodada). `POST /auth/login` já é mockado pelo MSW (`mocks/browser.ts`)
 * e responde 200 com dados de usuário/escritório reais o suficiente para
 * a UI — mas navegadores **ignoram `Set-Cookie` em respostas sintetizadas
 * por Service Worker** (limitação documentada do próprio MSW), então o
 * cookie `access_token` que `middleware.ts` verifica nunca seria
 * realmente gravado só com o mock. Esta rota é um `Route Handler` real do
 * Next.js (resposta genuína do servidor, não interceptada pelo MSW,
 * que só escuta `NEXT_PUBLIC_API_URL`) — grava o cookie de verdade para
 * a demonstração funcionar. Não existe em produção: fora do modo mock,
 * responde 404 e não faz nada.
 */
export async function POST() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('access_token', 'demo-access-token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
