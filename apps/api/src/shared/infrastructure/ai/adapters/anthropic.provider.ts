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

const DEFAULT_MODEL = 'claude-sonnet-5';

/** Mesmo racional/limitação de `openai.provider.ts` — ver comentário lá. */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const apiKey = this.config.get('AI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        'Provedor Anthropic sem AI_API_KEY configurada.',
      );
    }

    const model =
      request.model || this.config.get('AI_DEFAULT_MODEL', { infer: true }) || DEFAULT_MODEL;
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const start = Date.now();
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          system: systemMessage,
          messages: conversationMessages,
          max_tokens: request.maxTokens ?? 1500,
          temperature: request.temperature ?? 0.3,
        }),
      });
    } catch {
      throw new DomainError('AI_PROVIDER_UNAVAILABLE', 'Falha de rede ao chamar a Anthropic.');
    }

    if (!response.ok) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        `Anthropic retornou status ${response.status}.`,
      );
    }

    const json = (await response.json()) as {
      content: Array<{ text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = json.content.map((c) => c.text).join('');

    return {
      content,
      modelo: model,
      tokensEntrada:
        json.usage?.input_tokens ??
        estimateTokens(request.messages.map((m) => m.content).join('\n')),
      tokensSaida: json.usage?.output_tokens ?? estimateTokens(content),
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
