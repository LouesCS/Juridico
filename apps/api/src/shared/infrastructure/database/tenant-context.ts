import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de tenant por requisição — reafirma
 * docs/database/01-estrategia-multitenancy.md §1.4 e
 * docs/backend/05-autenticacao.md §5.3 (Office Context do Prompt 5B §11.1).
 *
 * Populado pelo TenantGuard logo após o JwtAuthGuard validar o token.
 * Nunca populado a partir de header, query ou body — sempre da claim do JWT.
 */
export interface TenantContext {
  usuarioId: string;
  escritorioId: string;
  membroId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  correlationId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const TenantContextStorage = {
  run<T>(context: TenantContext, callback: () => T): T {
    return storage.run(context, callback);
  },

  get(): TenantContext | undefined {
    return storage.getStore();
  },

  /**
   * Uso restrito a jobs de fila explicitamente autorizados (docs/backend/09-filas.md) —
   * nunca chamado a partir de um caminho HTTP.
   */
  runForJob<T>(context: TenantContext, callback: () => T): T {
    return storage.run(context, callback);
  },
};

export class MissingTenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Tentativa de operação "${operation}" em modelo tenant-scoped "${model}" sem TenantContext ativo — ` +
        `isso indica um caminho de código fora do guard de autenticação/tenant. Ver docs/database/01-estrategia-multitenancy.md §1.5.`,
    );
    this.name = 'MissingTenantContextError';
  }
}
