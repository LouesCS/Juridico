import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/env.schema';
import { AnthropicProvider } from './adapters/anthropic.provider';
import { GeminiProvider } from './adapters/gemini.provider';
import { MockAiProvider } from './adapters/mock.provider';
import { OllamaProvider } from './adapters/ollama.provider';
import { OpenAiProvider } from './adapters/openai.provider';
import { AiProvider } from './ai-provider.port';

/**
 * "Provider Registry" pedido pelo Sprint 11 — mantém os 5 adapters
 * disponíveis (nunca instanciados sob demanda a cada chamada) e resolve qual
 * está ativo via `AI_PROVIDER`. `healthCheckAll` sustenta o requisito de
 * "Health Check"; a lista ordenada por `failoverOrder` é a base para um
 * failover automático futuro (Sprint 11 pede apenas "preparado" — a troca de
 * provider em caso de falha não é automática nesta rodada, só a estrutura
 * que a tornaria possível sem mudar `AiSummaryService`).
 */
@Injectable()
export class AiProviderRegistry {
  private readonly providers: Map<string, AiProvider>;

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    mock: MockAiProvider,
    openai: OpenAiProvider,
    anthropic: AnthropicProvider,
    gemini: GeminiProvider,
    ollama: OllamaProvider,
  ) {
    this.providers = new Map<string, AiProvider>([
      [mock.name, mock],
      [openai.name, openai],
      [anthropic.name, anthropic],
      [gemini.name, gemini],
      [ollama.name, ollama],
    ]);
  }

  getActive(): AiProvider {
    const name = this.config.get('AI_PROVIDER', { infer: true });
    return this.providers.get(name) ?? this.providers.get('fake')!;
  }

  getByName(name: string): AiProvider | undefined {
    return this.providers.get(name);
  }

  /** Reafirma docs/backend-implementation/22-configuration-engine.md §22.4 (IA) — usado pela aba de configuração e pelo Dashboard das Configurações. */
  listNames(): string[] {
    return [...this.providers.keys()];
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      [...this.providers.entries()].map(async ([name, provider]) => {
        try {
          return [name, await provider.healthCheck()] as const;
        } catch {
          return [name, false] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  }
}
