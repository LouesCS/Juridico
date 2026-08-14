/**
 * Result<T> — comunica sucesso/falha de use case sem exceção para fluxo de
 * controle esperado (docs/backend/03-camadas.md §3.6). Exceção é reservada a
 * falha real de infraestrutura.
 */

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export const Result = {
  ok<T>(value: T): Result<T> {
    return { ok: true, value };
  },
  fail<T = never>(error: DomainError): Result<T> {
    return { ok: false, error };
  },
};
