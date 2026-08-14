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

const DEFAULT_MODEL = 'llama3';

/**
 * Modelos locais via Ollama — sem `AI_API_KEY` (é um servidor local, não um
 * SaaS), mas depende de `AI_OLLAMA_BASE_URL` estar acessível; sem servidor
 * Ollama rodando neste ambiente, `healthCheck`/`generate` falham por rede,
 * mesmo racional de indisponibilidade dos demais providers reais.
 */
@Injectable()
export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const baseUrl = this.config.get('AI_OLLAMA_BASE_URL', { infer: true });
    const model =
      request.model || this.config.get('AI_DEFAULT_MODEL', { infer: true }) || DEFAULT_MODEL;

    const start = Date.now();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: request.messages, stream: false }),
      });
    } catch {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        `Não foi possível conectar ao Ollama em ${baseUrl}.`,
      );
    }

    if (!response.ok) {
      throw new DomainError(
        'AI_PROVIDER_UNAVAILABLE',
        `Ollama retornou status ${response.status}.`,
      );
    }

    const json = (await response.json()) as { message: { content: string } };
    const content = json.message?.content ?? '';

    return {
      content,
      modelo: model,
      tokensEntrada: estimateTokens(request.messages.map((m) => m.content).join('\n')),
      tokensSaida: estimateTokens(content),
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
    try {
      const baseUrl = this.config.get('AI_OLLAMA_BASE_URL', { infer: true });
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
