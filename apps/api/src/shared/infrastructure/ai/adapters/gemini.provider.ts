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

const DEFAULT_MODEL = 'gemini-1.5-flash';

/** Mesmo racional/limitação de `openai.provider.ts` — ver comentário lá. */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const apiKey = this.config.get('AI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        'Provedor Gemini sem AI_API_KEY configurada.',
      );
    }

    const model =
      request.model || this.config.get('AI_DEFAULT_MODEL', { infer: true }) || DEFAULT_MODEL;
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const start = Date.now();
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage }] } } : {}),
            generationConfig: {
              temperature: request.temperature ?? 0.3,
              maxOutputTokens: request.maxTokens ?? 1500,
            },
          }),
        },
      );
    } catch {
      throw new DomainError('AI_PROVIDER_UNAVAILABLE', 'Falha de rede ao chamar o Gemini.');
    }

    if (!response.ok) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        `Gemini retornou status ${response.status}.`,
      );
    }

    const json = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const content = json.candidates[0]?.content.parts.map((p) => p.text).join('') ?? '';

    return {
      content,
      modelo: model,
      tokensEntrada:
        json.usageMetadata?.promptTokenCount ??
        estimateTokens(request.messages.map((m) => m.content).join('\n')),
      tokensSaida: json.usageMetadata?.candidatesTokenCount ?? estimateTokens(content),
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
