import { DomainError } from '../../domain/result';

export interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
}

/**
 * Timeout + retry com backoff exponencial em torno de `provider.generate()` —
 * reafirma pedido explícito do Sprint 11 ("Timeout", "Retry"). Nenhuma
 * dependência nova (`p-retry`/`p-timeout`) — poucas linhas, testável sem
 * rede real (usada com uma função fake nos testes).
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, timeoutMs = 30_000, backoffMs = 500 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }

  throw lastError;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new DomainError('GENERATION_TIMEOUT', `Tempo limite de ${ms}ms excedido.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
