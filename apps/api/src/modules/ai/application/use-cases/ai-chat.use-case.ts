import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AiProviderRegistry } from '../../../../shared/infrastructure/ai/ai-provider.registry';
import { withRetry } from '../../../../shared/infrastructure/ai/ai-retry';
import { UniversalSearchUseCase } from '../../../search/application/use-cases/universal-search.use-case';
import { ChatScopeType, FonteIaDraft } from '../../domain/ai-types';
import { AiQuotaService } from '../ai-quota.service';
import { CaseContextBuilder } from '../context-builders/case-context-builder';
import { DocumentContextBuilder } from '../context-builders/document-context-builder';
import { buildPrompt } from '../prompts/prompt-builder';
import { getPromptTemplate } from '../prompts/prompt-template';

const SEARCH_GROUP_LABEL: Record<string, string> = {
  clients: 'Clientes',
  'legal-cases': 'Processos',
  documents: 'Documentos',
  deadlines: 'Prazos',
  team: 'Equipe',
  folders: 'Pastas',
  timeline: 'Timeline',
  tags: 'Tags',
  comments: 'Comentários',
};

export interface ChatFonte {
  tipo: string;
  id: string | null;
  titulo: string;
  url: string | null;
}

export interface ChatInput {
  escopo: { tipo: ChatScopeType; id?: string };
  pergunta: string;
}

export interface ChatResult {
  resposta: string;
  fontes: ChatFonte[];
  modelo: string;
  tempoGeracaoMs: number;
}

function draftToChatFonte(fonte: FonteIaDraft): ChatFonte {
  const id =
    fonte.documentoId ?? fonte.eventoTimelineId ?? fonte.processoId ?? fonte.clienteId ?? null;
  const url = fonte.documentoId
    ? `/documentos/${fonte.documentoId}`
    : fonte.processoId
      ? `/processos/${fonte.processoId}`
      : fonte.clienteId
        ? `/clientes/${fonte.clienteId}`
        : null;
  return { tipo: fonte.sourceType, id, titulo: fonte.trechoOuReferencia, url };
}

/**
 * Reafirma Sprint 11 §"CHAT JURÍDICO" — "Copilot, não ChatGPT": conhece
 * sempre o contexto atual. `PROCESSO`/`DOCUMENTO` reaproveitam os mesmos
 * `ContextBuilder`s dos resumos (mesma autorização, mesmas fontes);
 * `GLOBAL` reusa `UniversalSearchUseCase` como fonte (Sprint 10), nunca
 * duplica indexação. **Stateless**: cada pergunta é uma chamada isolada,
 * sem histórico persistido no servidor — o histórico da conversa vive só no
 * estado do componente React (`AIChat`), decisão deliberada para não
 * introduzir uma tabela de conversas/mensagens sem necessidade comprovada
 * nesta rodada (documentado como possível evolução futura).
 */
@Injectable()
export class AiChatUseCase {
  constructor(
    private readonly caseContextBuilder: CaseContextBuilder,
    private readonly documentContextBuilder: DocumentContextBuilder,
    private readonly universalSearch: UniversalSearchUseCase,
    private readonly registry: AiProviderRegistry,
    private readonly quota: AiQuotaService,
  ) {}

  async execute(
    escritorioId: string,
    input: ChatInput,
    user: AuthUser,
  ): Promise<Result<ChatResult>> {
    if (input.pergunta.trim().length < 2) {
      return Result.fail(
        new DomainError('MALFORMED_REQUEST', 'Digite uma pergunta com ao menos 2 caracteres.'),
      );
    }

    const quotaStatus = await this.quota.checkQuota(escritorioId);
    if (!quotaStatus.permitido) {
      return Result.fail(
        new DomainError(
          'AI_QUOTA_EXCEEDED',
          'Este escritório atingiu o limite de resumos de IA do mês. Fale com o administrador da conta.',
        ),
      );
    }

    let promptContextCampos: Record<string, string | number | boolean | null | undefined>;
    let promptContextListas: Record<string, string[]>;
    let fontes: ChatFonte[];

    if (input.escopo.tipo === 'PROCESSO') {
      if (!input.escopo.id)
        return Result.fail(new DomainError('MALFORMED_REQUEST', 'escopo.id é obrigatório.'));
      const contextResult = await this.caseContextBuilder.build(
        escritorioId,
        input.escopo.id,
        user,
      );
      if (!contextResult.ok) return contextResult;
      promptContextCampos = contextResult.value.promptContext.campos;
      promptContextListas = contextResult.value.promptContext.listas ?? {};
      fontes = contextResult.value.fontes.map(draftToChatFonte);
    } else if (input.escopo.tipo === 'DOCUMENTO') {
      if (!input.escopo.id)
        return Result.fail(new DomainError('MALFORMED_REQUEST', 'escopo.id é obrigatório.'));
      const contextResult = await this.documentContextBuilder.build(
        escritorioId,
        input.escopo.id,
        user,
      );
      if (!contextResult.ok) return contextResult;
      promptContextCampos = contextResult.value.promptContext.campos;
      promptContextListas = contextResult.value.promptContext.listas ?? {};
      fontes = contextResult.value.fontes.map(draftToChatFonte);
    } else {
      const searchResponse = await this.universalSearch.execute(escritorioId, user, {
        q: input.pergunta,
        limit: 8,
      } as never);
      promptContextCampos = { 'Termo interpretado da pergunta': searchResponse.query };
      promptContextListas = {};
      fontes = [];
      for (const group of searchResponse.groups) {
        if (group.items.length === 0) continue;
        promptContextListas[SEARCH_GROUP_LABEL[group.type] ?? group.type] = group.items.map(
          (item) => `${item.titulo}${item.subtitulo ? ` — ${item.subtitulo}` : ''}`,
        );
        fontes.push(
          ...group.items.map((item) => ({
            tipo: item.tipo,
            id: item.id,
            titulo: item.titulo,
            url: item.url,
          })),
        );
      }
    }

    const template = getPromptTemplate('pergunta-livre');
    const request = buildPrompt(template, {
      campos: promptContextCampos,
      listas: promptContextListas,
      pergunta: input.pergunta,
    });

    const provider = this.registry.getActive();
    const start = Date.now();
    const result = await withRetry(() => provider.generate(request), {
      retries: 1,
      timeoutMs: 20_000,
    });

    return Result.ok({
      resposta: result.content,
      fontes,
      modelo: result.modelo,
      tempoGeracaoMs: Date.now() - start,
    });
  }
}
