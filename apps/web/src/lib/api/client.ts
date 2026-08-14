import { env } from '@/config/env';
import { createCorrelationId } from '@/lib/api/correlation';
import { type ApiError, networkApiError, toApiError } from '@/lib/api/errors';
import { emitSessionRevoked } from '@/lib/api/auth-events';
import { useSimulationStore } from '@/stores/simulation.store';

/**
 * Cliente HTTP central — reafirma docs/frontend/08-http-client.md.
 * `fetch` nativo, nunca axios/ky (§8.1). Toda feature chama a API através
 * deste único módulo.
 */

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Endpoints POST que criam recurso com efeito colateral significativo —
 * recebem `Idempotency-Key` automaticamente (docs/api/01-convencoes.md §1.11).
 * Lista fechada, ampliada conforme novos módulos ganham mutations reais.
 */
const IDEMPOTENT_WRITE_PATHS = ['/auth/register', '/invitations'];

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  correlationId?: string;
  headers?: Record<string, string>;
  /** Usado internamente pelo próprio refresh, para nunca reentrar em loop. */
  skipAuthRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function shouldAttachIdempotencyKey(method: string, path: string): boolean {
  if (method !== 'POST') return false;
  return IDEMPOTENT_WRITE_PATHS.some((prefix) => path.startsWith(prefix));
}

// Fila de refresh — uma única chamada concorrente, reafirma
// docs/frontend/08-http-client.md §8.4/docs/frontend/05-autenticacao.md §5.6.
let refreshInFlight: Promise<void> | null = null;

async function ensureFreshSession(): Promise<void> {
  refreshInFlight ??= fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => {
      if (!res.ok) throw new Error('refresh-failed');
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const correlationId = options.correlationId ?? createCorrelationId();
  const url = buildUrl(path, options.query);

  const headers: Record<string, string> = {
    'X-Correlation-Id': correlationId,
    ...options.headers,
  };
  // Permission Engine (Prompt 12 §Simulador) — quando o OWNER está
  // simulando outro membro, toda requisição carrega esse header; o
  // backend (`SimulationGuard`) é quem decide se é válido (mesmo escritório,
  // ator real com `simulation:use`). Fora de simulação, o store devolve
  // `null` e nada muda aqui.
  const simulatingMembroId = useSimulationStore.getState().simulatingMembroId;
  if (simulatingMembroId) headers['X-Simulate-Membro-Id'] = simulatingMembroId;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (shouldAttachIdempotencyKey(method, path)) headers['Idempotency-Key'] = crypto.randomUUID();

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
  } catch {
    throw networkApiError(correlationId);
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const error = await toApiError(response, correlationId);

  if (response.status === 401 && error.code === 'TOKEN_EXPIRED' && !options.skipAuthRetry) {
    try {
      await ensureFreshSession();
    } catch {
      emitSessionRevoked();
      throw error;
    }
    return request<T>(path, { ...options, correlationId, skipAuthRetry: true });
  }

  if (response.status === 401 && error.code !== 'TOKEN_EXPIRED') {
    emitSessionRevoked();
  }

  throw error;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
};

export type { ApiError };
