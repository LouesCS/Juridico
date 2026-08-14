import { NextResponse } from 'next/server';

/** Contraparte de `api/demo/login` — ver comentário lá. */
export async function POST() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('access_token');
  return response;
}
