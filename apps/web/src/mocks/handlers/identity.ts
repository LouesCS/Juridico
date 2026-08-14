import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de
 * apps/api/src/modules/identity/ (não do OpenAPI ainda gerado — ver
 * docs/frontend/09-openapi.md §9.1, pendência registrada em
 * docs/frontend-implementation/19-decisions.md). Usados só em teste
 * (mocks/server.ts) — em desenvolvimento, Identity já é real e não deve
 * ser interceptado (docs/frontend/28-mocks.md §28.1).
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string, fieldErrors?: unknown[]) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'mock-correlation-id',
      timestamp: new Date(0).toISOString(),
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status },
  );
}

const INITIAL_SESSIONS = [
  {
    id: 'session-atual',
    dispositivo: 'Chrome · Windows',
    ip: '203.0.113.10',
    ultimoUsoEm: '2026-07-30T12:00:00.000Z',
    criadaEm: '2026-07-20T09:00:00.000Z',
    atual: true,
  },
  {
    id: 'session-outra',
    dispositivo: 'Safari · iPhone',
    ip: '203.0.113.42',
    ultimoUsoEm: '2026-07-29T18:00:00.000Z',
    criadaEm: '2026-07-15T09:00:00.000Z',
    atual: false,
  },
];

let sessions = [...INITIAL_SESSIONS];

export function resetIdentityMocks() {
  sessions = [...INITIAL_SESSIONS];
}

export const identityHandlers = [
  http.post(`${base}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === 'ja-cadastrado@quilombo.dev') {
      return problem(409, 'EMAIL_ALREADY_EXISTS', 'Este e-mail já está em uso.');
    }
    return HttpResponse.json(
      {
        usuario: { id: 'mock-user-1', nome: 'Usuária', email: body.email ?? 'nova@quilombo.dev' },
        escritorio: {
          id: 'mock-office-1',
          slug: 'escritorio-mock',
          nomeFantasia: 'Escritório Mock',
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${base}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; senha?: string };
    if (body.senha === 'senha-errada-123') {
      return problem(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
    }
    return HttpResponse.json(
      {
        usuario: { id: 'mock-user-1', nome: 'Usuária', email: body.email },
        escritorios: [{ id: 'mock-office-1', nome: 'Escritório Mock', papel: 'OWNER' }],
        escritorioAtivoId: 'mock-office-1',
      },
      { status: 200 },
    );
  }),

  http.get(`${base}/me`, () => {
    return HttpResponse.json({
      usuario: {
        id: 'mock-user-1',
        nome: 'Usuária',
        sobrenome: 'Mock',
        email: 'usuaria@quilombo.dev',
        avatarUrl: null,
        tema: null,
        idioma: null,
      },
      membro: {
        id: 'mock-membro-1',
        papel: 'OWNER',
        permissions: [
          'office:read',
          'office:update',
          'member:read',
          'member:invite',
          'member:remove',
          'member:update-role',
          // Sprint "Colaboradores" — chaves novas (`member:create`/
          // `member:update`/`member:export`) não estavam no catálogo antes
          // desta Sprint; adicionadas ao OWNER mock pelo mesmo motivo que
          // `client:*` foi adicionado quando Clientes ganhou essas ações.
          'member:create',
          'member:update',
          'member:export',
          'client:create',
          'client:read',
          'client:update',
          'client:delete',
          'client:export',
          'case:create',
          'case:read:all',
          'case:update',
          'case:delete',
          'document:create',
          'document:read:all',
          'document:update',
          'document:delete',
          'document:download',
          'case:team:manage',
          'case:read:confidential',
          'legal-folder:create',
          'legal-folder:read:all',
          'legal-folder:read:team',
          'legal-folder:read:assigned',
          'legal-folder:update',
          'legal-folder:delete',
          'report:metrics:read',
          'role:manage',
          'simulation:use',
          'client:read:sensitive',
          'configuration:read',
          'configuration:manage',
          'capture:read',
          'capture:create',
          'capture:update',
          'capture:delete',
          'capture:sync',
          'capture:manage',
          'publication:read',
          'publication:update',
          'publication:delete',
          'publication:manage',
          'movement:read',
          'movement:update',
          'movement:manage',
          'extrajudicial-movement:read',
          'extrajudicial-movement:create',
          'extrajudicial-movement:update',
          'extrajudicial-movement:delete',
          'extrajudicial-movement:manage',
          'request:read',
          'request:create',
          'request:update',
          'request:delete',
          'ai:manage',
          'financeiro:read',
          'task:create',
          'task:read:all',
          'task:read:team',
          'task:read:assigned',
          'task:update',
          'task:delete',
          'task:team:manage',
          'comment:create',
        ],
      },
      escritorio: {
        id: 'mock-office-1',
        nome: 'Escritório Mock',
        slug: 'escritorio-mock',
      },
    });
  }),

  http.post(`${base}/auth/switch-office`, async ({ request }) => {
    const body = (await request.json()) as { escritorioId?: string };
    if (body.escritorioId === 'mock-office-revogado') {
      return problem(403, 'FORBIDDEN', 'Você não pertence a este escritório.');
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${base}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${base}/auth/password-recovery`, () =>
    HttpResponse.json({ ok: true }, { status: 202 }),
  ),

  http.post(`${base}/auth/password-reset`, async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === 'token-invalido') {
      return problem(422, 'MALFORMED_REQUEST', 'Token inválido ou expirado.');
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/me/password`, async ({ request }) => {
    const body = (await request.json()) as { senhaAtual?: string; novaSenha?: string };
    if (body.senhaAtual === 'senha-errada-123') {
      return problem(401, 'INVALID_CREDENTIALS', 'Senha atual incorreta.');
    }
    if ((body.novaSenha?.length ?? 0) < 12) {
      return problem(422, 'MALFORMED_REQUEST', 'A senha deve ter ao menos 12 caracteres.', [
        {
          field: 'novaSenha',
          code: 'too_small',
          message: 'A senha deve ter ao menos 12 caracteres.',
        },
      ]);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/auth/sessions`, () => HttpResponse.json(sessions)),

  http.delete(`${base}/auth/sessions/:id`, ({ params }) => {
    const session = sessions.find((s) => s.id === params.id);
    if (!session) return problem(404, 'NOT_FOUND', 'Sessão não encontrada.');
    sessions = sessions.filter((s) => s.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
