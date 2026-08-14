/**
 * Tipo único de erro de API — reafirma docs/frontend/23-errors.md §23.1.
 * Espelha o corpo RFC 9457 real do backend + `timestamp` (extensão
 * registrada em docs/backend-implementation/19-decisions.md §19.1).
 */
export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  correlationId: string;
  timestamp?: string;
  fieldErrors?: ApiFieldError[];
  meta?: Record<string, unknown>;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'status' in value &&
    'correlationId' in value
  );
}

/**
 * Normaliza qualquer falha (resposta HTTP não-2xx com corpo RFC 9457, corpo
 * inesperado, ou falha de rede/timeout) para o tipo único `ApiError` — nunca
 * propaga o `Response`/erro bruto para quem chamou. Reafirma
 * docs/frontend/08-http-client.md §8.3.
 */
export async function toApiError(response: Response, correlationId: string): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isApiError(body)) return body;
  } catch {
    // corpo não é JSON válido — cai para o fallback genérico abaixo
  }

  return {
    type: 'about:blank',
    title: response.statusText || 'Erro inesperado',
    status: response.status,
    detail: 'Não foi possível completar a ação. Verifique sua conexão e tente novamente.',
    code: 'INTERNAL_ERROR',
    correlationId,
  };
}

export function networkApiError(correlationId: string): ApiError {
  return {
    type: 'about:blank',
    title: 'Falha de rede',
    status: 0,
    detail: 'Não foi possível completar a ação. Verifique sua conexão e tente novamente.',
    code: 'NETWORK_ERROR',
    correlationId,
  };
}
