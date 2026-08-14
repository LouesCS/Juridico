/**
 * Estimativa aproximada de tokens (≈4 caracteres/token em português/inglês,
 * heurística comum quando não se quer adicionar uma dependência de
 * tokenizador real — `tiktoken`/`@anthropic-ai/tokenizer` — só para uma
 * estimativa de custo). Nunca usada para truncar contexto com precisão,
 * apenas para `tokensEntrada`/`tokensSaida`/estimativa de custo exibidos ao
 * usuário com `ai:usage:read`.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}
