import { Injectable, Logger } from '@nestjs/common';
import { EscopoResumoIA, TipoResumoIA } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../shared/domain/result';
import { AiProviderRegistry } from '../../../shared/infrastructure/ai/ai-provider.registry';
import { withRetry } from '../../../shared/infrastructure/ai/ai-retry';
import { TimelineRecorderService } from '../../timeline/application/timeline-recorder.service';
import { AiContextResult } from '../domain/ai-types';
import { AiQuotaService } from './ai-quota.service';
import { AiStreamBus } from './ai-stream-bus';
import { estimateCostCentavos } from './cost-estimator';
import { hashContent } from './context-hash';
import { buildPrompt } from './prompts/prompt-builder';
import { getPromptTemplate } from './prompts/prompt-template';

export interface RequestSummaryParams {
  escritorioId: string;
  escopoTipo: EscopoResumoIA;
  escopoId: string;
  tipoResumo: TipoResumoIA;
  templateId: string;
  user: AuthUser;
  contextResult: AiContextResult;
  /** `true` em `POST .../regenerate` — ignora o cache de `hashContexto`, sempre cria nova versão (docs/api/14-ai.md §14.4). */
  force?: boolean;
}

function scopeColumn(escopoTipo: EscopoResumoIA, escopoId: string) {
  return {
    processoId: escopoTipo === 'PROCESSO' ? escopoId : null,
    documentoId: escopoTipo === 'DOCUMENTO' ? escopoId : null,
    clienteId: escopoTipo === 'CLIENTE' ? escopoId : null,
    // Adicionado no Prompt 14 (Task Engine).
    tarefaId: escopoTipo === 'TAREFA' ? escopoId : null,
  };
}

/**
 * Orquestra a geração de um `ResumoIA` — reafirma
 * docs/database/06-entidades-ia-notificacoes-auditoria.md §6.1.1/§6.1.2:
 * cota verificada ANTES de criar a linha `PENDENTE`; `GERANDO` em curso do
 * mesmo escopo+tipo devolve o mesmo id (idempotência) em vez de duplicar;
 * `hashContexto` igual ao vigente e `PRONTO` retorna o cache sem chamar o
 * provedor. Geração roda em segundo plano (`void this.runGeneration(...)`,
 * nunca `await`ado pelo caller) publicando tokens via `AiStreamBus` — o
 * endpoint SSE (`GET .../stream`) e o `POST` inicial são desacoplados,
 * reafirma docs/api/14-ai.md §14.1/§14.3 (`202` + stream separado).
 */
@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiProviderRegistry,
    private readonly quota: AiQuotaService,
    private readonly streamBus: AiStreamBus,
    private readonly timelineRecorder: TimelineRecorderService,
  ) {}

  async requestSummary(
    params: RequestSummaryParams,
  ): Promise<Result<{ id: string; status: string }>> {
    const quotaStatus = await this.quota.checkQuota(params.escritorioId);
    if (!quotaStatus.permitido) {
      return Result.fail(
        new DomainError(
          'AI_QUOTA_EXCEEDED',
          'Este escritório atingiu o limite de resumos de IA do mês. Fale com o administrador da conta.',
        ),
      );
    }

    const scopeCols = scopeColumn(params.escopoTipo, params.escopoId);
    const scopeWhere = {
      processoId: scopeCols.processoId ?? undefined,
      documentoId: scopeCols.documentoId ?? undefined,
      clienteId: scopeCols.clienteId ?? undefined,
      tarefaId: scopeCols.tarefaId ?? undefined,
    };

    const emAndamento = await this.prisma.client.resumoIA.findFirst({
      where: { ...scopeWhere, tipoResumo: params.tipoResumo, status: 'GERANDO' },
      orderBy: { criadoEm: 'desc' },
    });
    if (emAndamento) return Result.ok({ id: emAndamento.id, status: emAndamento.status });

    const hashContexto = hashContent(params.contextResult.promptContext);
    const vigente = await this.prisma.client.resumoIA.findFirst({
      where: { ...scopeWhere, tipoResumo: params.tipoResumo, vigente: true },
    });
    if (
      !params.force &&
      vigente &&
      vigente.status === 'PRONTO' &&
      vigente.hashContexto === hashContexto
    ) {
      return Result.ok({ id: vigente.id, status: vigente.status });
    }

    const template = getPromptTemplate(params.templateId);
    const versaoResumo = vigente ? vigente.versaoResumo + 1 : 1;

    const novo = await this.prisma.client.$transaction(async (tx) => {
      if (vigente)
        await tx.resumoIA.update({ where: { id: vigente.id }, data: { vigente: false } });
      return tx.resumoIA.create({
        data: {
          escritorioId: params.escritorioId,
          escopoTipo: params.escopoTipo,
          processoId: scopeCols.processoId,
          documentoId: scopeCols.documentoId,
          clienteId: scopeCols.clienteId,
          tarefaId: scopeCols.tarefaId,
          solicitadoPorId: params.user.membroId,
          tipoResumo: params.tipoResumo,
          versaoResumo,
          status: 'GERANDO',
          modelo: template.modeloRecomendado,
          promptVersion: `${template.id}@${template.versao}`,
          hashContexto,
          vigente: true,
        },
      });
    });

    void this.runGeneration(novo.id, template.id, params.contextResult, params.user.membroId);

    return Result.ok({ id: novo.id, status: 'GERANDO' });
  }

  private async runGeneration(
    resumoId: string,
    templateId: string,
    contextResult: AiContextResult,
    solicitadoPorId: string,
  ): Promise<void> {
    const template = getPromptTemplate(templateId);
    try {
      const request = buildPrompt(template, contextResult.promptContext);
      const provider = this.registry.getActive();

      let content = '';
      let finalResult:
        | { modelo: string; tokensEntrada: number; tokensSaida: number; latenciaMs: number }
        | undefined;

      await withRetry(
        async () => {
          content = '';
          const stream = provider.generateStream(request);
          let next = await stream.next();
          while (!next.done) {
            content += next.value.delta;
            this.streamBus.publish(resumoId, { type: 'token', data: { delta: next.value.delta } });
            next = await stream.next();
          }
          finalResult = next.value;
        },
        { retries: 1, timeoutMs: 30_000 },
      );

      if (!finalResult)
        throw new DomainError('AI_PROVIDER_UNAVAILABLE', 'Provedor não retornou resultado.');

      const custoEstimadoCentavos = estimateCostCentavos(
        finalResult.modelo,
        finalResult.tokensEntrada,
        finalResult.tokensSaida,
      );

      await this.prisma.client.$transaction(async (tx) => {
        await tx.resumoIA.update({
          where: { id: resumoId },
          data: {
            status: 'PRONTO',
            conteudo: content,
            modelo: finalResult!.modelo,
            tokensEntrada: finalResult!.tokensEntrada,
            tokensSaida: finalResult!.tokensSaida,
            custoEstimadoCentavos,
            latenciaMs: finalResult!.latenciaMs,
            geradoEm: new Date(),
          },
        });
        if (contextResult.fontes.length > 0) {
          await tx.fonteIA.createMany({
            data: contextResult.fontes.map((fonte, index) => ({
              resumoIaId: resumoId,
              sourceType: fonte.sourceType,
              documentoId: fonte.documentoId,
              eventoTimelineId: fonte.eventoTimelineId,
              processoId: fonte.processoId,
              clienteId: fonte.clienteId,
              tarefaId: fonte.tarefaId,
              hashFonte: fonte.hashFonte,
              ordem: index + 1,
              trechoOuReferencia: fonte.trechoOuReferencia,
            })),
          });
        }
      });

      contextResult.fontes.forEach((fonte, index) => {
        this.streamBus.publish(resumoId, {
          type: 'source',
          data: {
            ordem: index + 1,
            sourceType: fonte.sourceType,
            trechoOuReferencia: fonte.trechoOuReferencia,
          },
        });
      });
      this.streamBus.publish(resumoId, {
        type: 'done',
        data: {
          id: resumoId,
          status: 'PRONTO',
          tokensEntrada: finalResult.tokensEntrada,
          tokensSaida: finalResult.tokensSaida,
        },
      });

      const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id: resumoId } });
      if (resumo?.processoId) {
        await this.timelineRecorder.record({
          escritorioId: resumo.escritorioId,
          processoId: resumo.processoId,
          tipo: 'IA_EXECUTADA',
          titulo: `Resumo de IA gerado (${template.nome})`,
          autorId: solicitadoPorId,
          origem: 'IA',
        });
      } else if (resumo?.tarefaId) {
        // Adicionado no Prompt 14 (Task Engine) — mesma gravação automática
        // de Timeline que Processo já tinha, agora também para Tarefa.
        await this.timelineRecorder.record({
          escritorioId: resumo.escritorioId,
          tarefaId: resumo.tarefaId,
          tipo: 'IA_EXECUTADA',
          titulo: `Resumo de IA gerado (${template.nome})`,
          autorId: solicitadoPorId,
          origem: 'IA',
        });
      }
    } catch (error) {
      const domainError =
        error instanceof DomainError
          ? error
          : new DomainError('AI_PROVIDER_UNAVAILABLE', 'Falha ao gerar resumo de IA.');
      this.logger.warn(`Falha ao gerar ResumoIA ${resumoId}: ${domainError.message}`);
      try {
        await this.prisma.client.resumoIA.update({
          where: { id: resumoId },
          data: { status: 'FALHA', erro: domainError.message },
        });
      } catch (persistError) {
        this.logger.error(
          `Falha ao gravar status FALHA do ResumoIA ${resumoId}: ${String(persistError)}`,
        );
      }
      this.streamBus.publish(resumoId, {
        type: 'error',
        data: { code: domainError.code, message: domainError.message },
      });
    }
  }
}
