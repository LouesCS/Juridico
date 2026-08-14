/**
 * Reafirma Sprint 11 §"CUSTO" — tabela estática de custo por 1K tokens
 * (USD, valores públicos aproximados de cada provedor em 2026) convertida
 * para centavos de real por uma taxa fixa aproximada (não é câmbio real —
 * documentado, ajustável). `mock-v1`/`llama3` (local) têm custo zero.
 */
const CUSTO_POR_MIL_TOKENS_USD: Record<string, { entrada: number; saida: number }> = {
  'mock-v1': { entrada: 0, saida: 0 },
  'gpt-4o-mini': { entrada: 0.00015, saida: 0.0006 },
  'claude-sonnet-5': { entrada: 0.003, saida: 0.015 },
  'gemini-1.5-flash': { entrada: 0.000075, saida: 0.0003 },
  llama3: { entrada: 0, saida: 0 },
};

const FALLBACK_CUSTO = { entrada: 0.001, saida: 0.002 };
const USD_PARA_CENTAVOS_BRL = 550; // ≈ R$5,50/USD — taxa fixa aproximada, não câmbio real

export function estimateCostCentavos(
  modelo: string,
  tokensEntrada: number,
  tokensSaida: number,
): number {
  const custo = CUSTO_POR_MIL_TOKENS_USD[modelo] ?? FALLBACK_CUSTO;
  const usd = (tokensEntrada / 1000) * custo.entrada + (tokensSaida / 1000) * custo.saida;
  return Math.round(usd * USD_PARA_CENTAVOS_BRL);
}
