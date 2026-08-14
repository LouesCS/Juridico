import { Injectable } from '@nestjs/common';
import {
  AiGenerateRequest,
  AiGenerateResult,
  AiProvider,
  AiStreamChunk,
} from '../ai-provider.port';
import { estimateTokens } from '../token-estimate';

/**
 * Provider `fake` (default de `AI_PROVIDER`, docs/backend/02-modulos.md) —
 * **real e determinístico**, não um stub sem comportamento (diferente de
 * `S3StorageAdapter`, que sempre lança erro): o `PromptBuilder`
 * (`modules/ai/application/prompts/prompt-builder.ts`) formata o contexto
 * como linhas `Campo: valor` dentro da mensagem `user`; este provider
 * extrai essas linhas por regex e monta uma resposta coerente com os dados
 * reais recebidos — nunca texto aleatório/genérico, para que o mesmo
 * `AiSummaryService`/`AiChatUseCase` sejam exercitáveis de ponta a ponta em
 * teste e em `npm run dev` sem nenhuma credencial de provedor real.
 *
 * `generateStream` fatia a resposta em palavras (delay mínimo) — streaming
 * genuinamente incremental (múltiplos eventos SSE reais), só que a
 * "geração" em si não é incremental de fato (mesma limitação honesta de
 * qualquer mock).
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'fake';

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const start = Date.now();
    const content = this.buildContent(request);
    const inputText = request.messages.map((m) => m.content).join('\n');
    return {
      content,
      modelo: 'mock-v1',
      tokensEntrada: estimateTokens(inputText),
      tokensSaida: estimateTokens(content),
      latenciaMs: Math.max(1, Date.now() - start),
    };
  }

  async *generateStream(
    request: AiGenerateRequest,
  ): AsyncGenerator<AiStreamChunk, AiGenerateResult> {
    const result = await this.generate(request);
    const words = result.content.split(' ');
    for (const word of words) {
      yield { delta: `${word} ` };
    }
    return result;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private buildContent(request: AiGenerateRequest): string {
    const userMessage = request.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');
    const instruction = request.messages.find((m) => m.role === 'system')?.content ?? '';

    const campos = this.extractFields(userMessage);
    const listas = this.extractLists(userMessage);
    const pergunta = this.extractPergunta(userMessage);

    const linhas: string[] = [];
    linhas.push(
      '[Modo de demonstração — MockAiProvider, sem chamada a um modelo real. ' +
        'Configure AI_PROVIDER/AI_API_KEY para respostas geradas por IA de verdade.]',
    );
    linhas.push('');

    if (pergunta) {
      linhas.push(`Sobre "${pergunta}":`);
      const relevantes = this.findRelevantLines(userMessage, pergunta);
      if (relevantes.length > 0) {
        linhas.push(...relevantes.map((l) => `- ${l}`));
      } else {
        linhas.push('Não encontrei informação diretamente relacionada nas fontes disponíveis.');
      }
    } else {
      const titulo = campos.get('Título') ?? campos.get('Nome') ?? 'este item';
      linhas.push(`Resumo de ${titulo}.`);
      for (const [campo, valor] of campos) {
        if (campo === 'Título' || campo === 'Nome') continue;
        linhas.push(`${campo}: ${valor}.`);
      }
      for (const [titulo2, itens] of listas) {
        if (itens.length === 0) continue;
        linhas.push(`${titulo2}: ${itens.slice(0, 5).join('; ')}.`);
      }
    }

    if (instruction.toLowerCase().includes('risco')) {
      linhas.push(
        'Nenhum risco crítico identificado automaticamente — revisão humana recomendada.',
      );
    }

    return linhas.join('\n');
  }

  private extractFields(text: string): Map<string, string> {
    const campos = new Map<string, string>();
    for (const match of text.matchAll(/^([A-ZÀ-Ú][\w ÀÁÂÃÉÊÍÓÔÕÚÇà-ú]{2,30}):\s*(.+)$/gm)) {
      const [, campo, valor] = match;
      if (!valor.startsWith('-') && valor.trim().length > 0) campos.set(campo.trim(), valor.trim());
    }
    return campos;
  }

  private extractLists(text: string): Map<string, string[]> {
    const listas = new Map<string, string[]>();
    const blocos = text.split(/\n(?=[A-ZÀ-Ú].*:\s*$)/m);
    for (const bloco of blocos) {
      const [primeiraLinha, ...resto] = bloco.split('\n');
      if (!primeiraLinha?.trim().endsWith(':')) continue;
      const titulo = primeiraLinha.replace(':', '').trim();
      const itens = resto.map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean);
      if (itens.length > 0) listas.set(titulo, itens);
    }
    return listas;
  }

  private extractPergunta(text: string): string | null {
    const match = text.match(/Pergunta:\s*(.+)/);
    return match ? match[1].trim() : null;
  }

  private findRelevantLines(text: string, pergunta: string): string[] {
    const palavrasChave = pergunta
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return text
      .split('\n')
      .filter((linha) => palavrasChave.some((palavra) => linha.toLowerCase().includes(palavra)))
      .slice(0, 5);
  }
}
