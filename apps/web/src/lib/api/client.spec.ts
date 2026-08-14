import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { authEvents, AUTH_SESSION_REVOKED_EVENT } from './auth-events';
import { useSimulationStore } from '@/stores/simulation.store';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('faz GET com credentials include e X-Correlation-Id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '1' }));

    const result = await apiClient.get<{ id: string }>('/office');

    expect(result).toEqual({ id: '1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/office');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-Correlation-Id']).toBeTruthy();
  });

  it('serializa query params, ignorando undefined/null', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await apiClient.get('/legal-cases', { query: { status: 'ATIVO', responsavelId: undefined } });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/legal-cases?status=ATIVO');
  });

  it('anexa X-Simulate-Membro-Id quando o Simulador está ativo (Permission Engine, Prompt 12)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '1' }));
    useSimulationStore.getState().start('membro-estagiario', 'Estagiário (ESTAGIARIO)');

    try {
      await apiClient.get('/office');
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-Simulate-Membro-Id']).toBe('membro-estagiario');
    } finally {
      useSimulationStore.getState().stop();
    }
  });

  it('não anexa X-Simulate-Membro-Id fora de simulação', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '1' }));

    await apiClient.get('/office');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Simulate-Membro-Id']).toBeUndefined();
  });

  it('retorna undefined em 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiClient.delete('/auth/sessions/abc');
    expect(result).toBeUndefined();
  });

  it('propaga ApiError normalizado em resposta de erro', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Credenciais inválidas',
          status: 401,
          detail: 'Credenciais inválidas.',
          code: 'INVALID_CREDENTIALS',
          correlationId: 'corr-1',
        },
        401,
      ),
    );

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', senha: 'x' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
  });

  it('em falha de rede, propaga ApiError code NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('failed to fetch'));

    await expect(apiClient.get('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('em 401 TOKEN_EXPIRED, faz refresh e reenvia a requisição uma única vez', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Sessão expirada',
            status: 401,
            detail: '...',
            code: 'TOKEN_EXPIRED',
            correlationId: 'corr-2',
          },
          401,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true })) // POST /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ id: 'user-1' })); // retry de GET /me

    const result = await apiClient.get<{ id: string }>('/me');

    expect(result).toEqual({ id: 'user-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3000/api/v1/auth/refresh');
  });

  it('em 401 SESSION_REVOKED, emite evento de sessão revogada e não retenta', async () => {
    const listener = vi.fn();
    authEvents.addEventListener(AUTH_SESSION_REVOKED_EVENT, listener);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Sessão revogada',
          status: 401,
          detail: '...',
          code: 'SESSION_REVOKED',
          correlationId: 'corr-3',
        },
        401,
      ),
    );

    await expect(apiClient.get('/me')).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);

    authEvents.removeEventListener(AUTH_SESSION_REVOKED_EVENT, listener);
  });

  it('anexa Idempotency-Key em POST de escrita significativa (register)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '1' }, 201));

    await apiClient.post('/auth/register', { email: 'a@b.com' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBeTruthy();
  });
});
