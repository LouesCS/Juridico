/**
 * Reafirma pedido do Sprint 10 ("Registrar: tempo da busca, quantidade de
 * resultados, categoria escolhida, atalho utilizado — sem dados sensíveis").
 * Nenhum backend de analytics existe ainda (mesmo racional de honestidade já
 * aplicado a antivírus/BullMQ na Sprint 09: preparar a interface, não fingir
 * uma integração que não existe) — este módulo só registra em memória +
 * `console.debug` em desenvolvimento, pronto para ser trocado por uma chamada
 * real (Segment/PostHog/endpoint próprio) sem tocar nos call sites.
 */
export interface SearchTelemetryEvent {
  tipo: 'busca' | 'categoria_escolhida' | 'atalho_utilizado';
  duracaoMs?: number;
  quantidadeResultados?: number;
  categoria?: string;
  atalho?: string;
}

const buffer: SearchTelemetryEvent[] = [];
const MAX_BUFFER = 50;

export function logSearchTelemetry(event: SearchTelemetryEvent): void {
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  if (process.env.NODE_ENV === 'development') {
    console.debug('[search-telemetry]', event);
  }
}

export function getBufferedTelemetry(): readonly SearchTelemetryEvent[] {
  return buffer;
}
