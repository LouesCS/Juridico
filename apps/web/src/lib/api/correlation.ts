/**
 * Gerado uma vez por operação de negócio (não por requisição HTTP isolada)
 * — reafirma docs/api/01-convencoes.md §1.10 e
 * docs/frontend/08-http-client.md §8.2. Quem dispara uma ação do usuário
 * que produz múltiplas chamadas relacionadas gera um único
 * `correlationId` e o propaga manualmente entre elas.
 */
export function createCorrelationId(): string {
  return crypto.randomUUID();
}
