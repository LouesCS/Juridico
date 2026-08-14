/**
 * Reafirma Sprint 11 ("nunca acoplar o sistema a um único fornecedor") —
 * nenhum use case de `modules/ai/` conhece o SDK/API de um provedor
 * concreto, apenas esta interface. Binding real por `AI_PROVIDER`
 * (`fake`|`openai`|`anthropic`|`gemini`|`ollama`) em `ai.module.ts`, mesmo
 * padrão de `STORAGE_PORT`/`MAIL_PORT`.
 */
export const AI_PROVIDER_PORT = Symbol('AI_PROVIDER_PORT');

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiGenerateRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiGenerateResult {
  content: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  latenciaMs: number;
}

export interface AiStreamChunk {
  delta: string;
}

/**
 * `generateStream` é um async generator — o `return` do generator carrega o
 * resultado final (mesmos campos de `AiGenerateResult`), permitindo ao
 * consumidor (`AiSummaryService`) persistir tokens/latência sem precisar
 * somar os deltas manualmente.
 */
export interface AiProvider {
  readonly name: string;
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
  generateStream(request: AiGenerateRequest): AsyncGenerator<AiStreamChunk, AiGenerateResult>;
  healthCheck(): Promise<boolean>;
}
