import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../../domain/result';
import type { EnvConfig } from '../../../../config/env.schema';
import {
  AiGenerateRequest,
  AiGenerateResult,
  AiProvider,
  AiStreamChunk,
} from '../ai-provider.port';
import { estimateTokens } from '../token-estimate';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Adapter real (chamada HTTP correta via `fetch`, mesmo racional de
 * `apiClient` no frontend — nunca um SDK novo só para isto), mas **nunca
 * exercitado nesta rodada**: sem `AI_API_KEY` configurada neste ambiente,
 * lança `AI_PROVIDER_UNAVAILABLE` imediatamente, mesmo padrão de
 * `S3StorageAdapter`. Diferente do S3 (stub puro), este código chamaria a
 * API real da OpenAI corretamente se uma chave fosse fornecida — só não há
 * como validar isso neste ambiente (sem acesso de rede de saída/credencial).
 * `generateStream` faz fallback para `generate()` + fatiamento em palavras —
 * documentado como limitação honesta: implementar o parsing de SSE real da
 * OpenAI sem poder testá-lo contra a API de verdade seria código não
 * verificável (reafirma docs/backend-implementation/20-context-next-step.md
 * — mesmo racional que evitou `$queryRaw` em Search).
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const apiKey = this.config.get('AI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        'Provedor OpenAI sem AI_API_KEY configurada.',
      );
    }

    const model =
      request.model || this.config.get('AI_DEFAULT_MODEL', { infer: true }) || DEFAULT_MODEL;
    const start = Date.now();
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 1500,
        }),
      });
    } catch {
      throw new DomainError('AI_PROVIDER_UNAVAILABLE', 'Falha de rede ao chamar a OpenAI.');
    }

    if (!response.ok) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        `OpenAI retornou status ${response.status}.`,
      );
    }

    const json = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const content = json.choices[0]?.message.content ?? '';

    return {
      content,
      modelo: model,
      tokensEntrada:
        json.usage?.prompt_tokens ??
        estimateTokens(request.messages.map((m) => m.content).join('\n')),
      tokensSaida: json.usage?.completion_tokens ?? estimateTokens(content),
      latenciaMs: Date.now() - start,
    };
  }

  async *generateStream(
    request: AiGenerateRequest,
  ): AsyncGenerator<AiStreamChunk, AiGenerateResult> {
    const result = await this.generate(request);
    for (const word of result.content.split(' ')) yield { delta: `${word} ` };
    return result;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.get('AI_API_KEY', { infer: true }));
  }
}
