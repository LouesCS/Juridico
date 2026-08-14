import { Injectable } from '@nestjs/common';
import { EscopoResumoIA, TipoResumoIA } from '@prisma/client';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { Result } from '../../../../shared/domain/result';
import { AiSummaryService } from '../ai-summary.service';
import { CaseContextBuilder } from '../context-builders/case-context-builder';
import { ClientContextBuilder } from '../context-builders/client-context-builder';
import { DocumentContextBuilder } from '../context-builders/document-context-builder';
import { TaskContextBuilder } from '../context-builders/task-context-builder';

const TEMPLATE_POR_TIPO_RESUMO: Record<TipoResumoIA, string> = {
  GERAL: 'resumo-processo-geral',
  EXECUTIVO: 'resumo-processo-executivo',
  CRONOLOGICO: 'resumo-processo-cronologico',
  PONTOS_CHAVE: 'resumo-processo-pontoschave',
  RISCOS: 'resumo-processo-riscos',
  RESUMO_DOCUMENTO: 'resumo-documento',
  HISTORICO_CLIENTE: 'resumo-cliente',
  // Adicionados no Prompt 14 (Task Engine) — 5 ações de IA de Tarefa.
  TAREFA_RESUMO: 'tarefa-resumo',
  TAREFA_CHECKLIST: 'tarefa-checklist',
  TAREFA_PROXIMOS_PASSOS: 'tarefa-proximos-passos',
  TAREFA_DESCRICAO: 'tarefa-descricao',
  TAREFA_CONTEXTO: 'tarefa-contexto',
};

/**
 * Um único use case para os 3 pontos de entrada de "Resumir"
 * (`POST /legal-cases/:id/ai-summaries`, `/documents/:id/ai-summaries`,
 * `/clients/:id/ai-summaries`) — a única diferença entre eles é qual
 * `ContextBuilder` monta o contexto; `AiSummaryService` (cache/cota/geração)
 * é idêntico para os três. `escopoTipo` já determina univocamente o
 * `tipoResumo` para Documento/Cliente (só têm um tipo de resumo cada).
 */
@Injectable()
export class RequestSummaryUseCase {
  constructor(
    private readonly caseContextBuilder: CaseContextBuilder,
    private readonly documentContextBuilder: DocumentContextBuilder,
    private readonly clientContextBuilder: ClientContextBuilder,
    private readonly taskContextBuilder: TaskContextBuilder,
    private readonly aiSummaryService: AiSummaryService,
  ) {}

  async execute(
    escritorioId: string,
    escopoTipo: EscopoResumoIA,
    escopoId: string,
    tipoResumo: TipoResumoIA | undefined,
    user: AuthUser,
    force = false,
  ): Promise<Result<{ id: string; status: string }>> {
    const tipoResumoEfetivo = this.resolveTipoResumo(escopoTipo, tipoResumo);

    const contextResult = await this.resolveContext(escritorioId, escopoTipo, escopoId, user);
    if (!contextResult.ok) return contextResult;

    return this.aiSummaryService.requestSummary({
      escritorioId,
      escopoTipo,
      escopoId,
      tipoResumo: tipoResumoEfetivo,
      templateId: TEMPLATE_POR_TIPO_RESUMO[tipoResumoEfetivo],
      user,
      contextResult: contextResult.value,
      force,
    });
  }

  resolveTipoResumo(
    escopoTipo: EscopoResumoIA,
    tipoResumo: TipoResumoIA | undefined,
  ): TipoResumoIA {
    if (escopoTipo === 'DOCUMENTO') return 'RESUMO_DOCUMENTO';
    if (escopoTipo === 'CLIENTE') return 'HISTORICO_CLIENTE';
    if (escopoTipo === 'TAREFA') return tipoResumo ?? 'TAREFA_RESUMO';
    return tipoResumo ?? 'GERAL';
  }

  private resolveContext(
    escritorioId: string,
    escopoTipo: EscopoResumoIA,
    escopoId: string,
    user: AuthUser,
  ) {
    switch (escopoTipo) {
      case 'DOCUMENTO':
        return this.documentContextBuilder.build(escritorioId, escopoId, user);
      case 'CLIENTE':
        return this.clientContextBuilder.build(escritorioId, escopoId, user);
      case 'TAREFA':
        return this.taskContextBuilder.build(escritorioId, escopoId, user);
      default:
        return this.caseContextBuilder.build(escritorioId, escopoId, user);
    }
  }
}
