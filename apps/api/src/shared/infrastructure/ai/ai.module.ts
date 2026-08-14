import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnthropicProvider } from './adapters/anthropic.provider';
import { GeminiProvider } from './adapters/gemini.provider';
import { MockAiProvider } from './adapters/mock.provider';
import { OllamaProvider } from './adapters/ollama.provider';
import { OpenAiProvider } from './adapters/openai.provider';
import { AiProviderRegistry } from './ai-provider.registry';

/**
 * Reafirma Sprint 11 — camada de orquestração de IA como abstração global
 * (`@Global()`, mesmo padrão de `StorageModule`/`MailModule`), disponível a
 * `modules/ai/` sem import explícito. Nenhuma tela ou use case de outro
 * módulo chama um provedor de IA diretamente — todos passam por
 * `AiProviderRegistry`/`AiSummaryService` (`modules/ai/`).
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MockAiProvider,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    OllamaProvider,
    AiProviderRegistry,
  ],
  exports: [AiProviderRegistry],
})
export class AiInfrastructureModule {}
