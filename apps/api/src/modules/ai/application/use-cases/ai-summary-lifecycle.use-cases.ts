import { Injectable } from '@nestjs/common';
import { EscopoResumoIA } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AiStreamBus } from '../ai-stream-bus';
import { assertResumoAccess } from '../resumo-access';
import { RequestSummaryUseCase } from './request-summary.use-case';

/** Reafirma docs/api/14-ai.md §14.2 — custo/tokens só aparecem para quem tem `ai:usage:read`. */
function toDto(
  resumo: NonNullable<Awaited<ReturnType<PrismaService['client']['resumoIA']['findFirst']>>>,
  podeVerCusto: boolean,
) {
  const base = {
    id: resumo.id,
    escopoTipo: resumo.escopoTipo,
    processoId: resumo.processoId,
    documentoId: resumo.documentoId,
    clienteId: resumo.clienteId,
    tarefaId: resumo.tarefaId,
    tipoResumo: resumo.tipoResumo,
    versaoResumo: resumo.versaoResumo,
    status: resumo.status,
    conteudo: resumo.conteudo,
    estruturaJson: resumo.estruturaJson,
    modelo: resumo.modelo,
    promptVersion: resumo.promptVersion,
    erro: resumo.erro,
    feedback: resumo.feedback,
    comentarioFeedback: resumo.comentarioFeedback,
    vigente: resumo.vigente,
    geradoEm: resumo.geradoEm,
    criadoEm: resumo.criadoEm,
    streamUrl: `/ai-summaries/${resumo.id}/stream`,
  };
  if (!podeVerCusto) return base;
  return {
    ...base,
    tokensEntrada: resumo.tokensEntrada,
    tokensSaida: resumo.tokensSaida,
    custoEstimadoCentavos: resumo.custoEstimadoCentavos,
    latenciaMs: resumo.latenciaMs,
  };
}

@Injectable()
export class GetSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, user: AuthUser) {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    if (!(await assertResumoAccess(this.prisma, escritorioId, resumo, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    }
    return Result.ok(toDto(resumo, user.permissions.includes('ai:usage:read')));
  }
}

@Injectable()
export class ListSummariesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    escopoTipo: EscopoResumoIA,
    escopoId: string,
    user: AuthUser,
  ) {
    const scopeWhere =
      escopoTipo === 'DOCUMENTO'
        ? { documentoId: escopoId }
        : escopoTipo === 'CLIENTE'
          ? { clienteId: escopoId }
          : escopoTipo === 'TAREFA'
            ? { tarefaId: escopoId }
            : { processoId: escopoId };

    const algum = await this.prisma.client.resumoIA.findFirst({
      where: { ...scopeWhere, escritorioId },
    });
    if (algum && !(await assertResumoAccess(this.prisma, escritorioId, algum, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Recurso não encontrado.'));
    }

    const resumos = await this.prisma.client.resumoIA.findMany({
      where: { ...scopeWhere, escritorioId },
      orderBy: [{ tipoResumo: 'asc' }, { versaoResumo: 'desc' }],
    });
    const podeVerCusto = user.permissions.includes('ai:usage:read');
    return Result.ok(resumos.map((r) => toDto(r, podeVerCusto)));
  }
}

@Injectable()
export class GetSummarySourcesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, user: AuthUser) {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    if (!(await assertResumoAccess(this.prisma, escritorioId, resumo, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    }
    const fontes = await this.prisma.client.fonteIA.findMany({
      where: { resumoIaId: id },
      orderBy: { ordem: 'asc' },
    });
    return Result.ok(fontes);
  }
}

@Injectable()
export class RegenerateSummaryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestSummary: RequestSummaryUseCase,
  ) {}

  async execute(escritorioId: string, id: string, user: AuthUser) {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    if (!(await assertResumoAccess(this.prisma, escritorioId, resumo, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    }

    const escopoId = resumo.processoId ?? resumo.documentoId ?? resumo.clienteId ?? resumo.tarefaId;
    if (!escopoId) return Result.fail(new DomainError('NOT_FOUND', 'Resumo sem escopo válido.'));

    return this.requestSummary.execute(
      escritorioId,
      resumo.escopoTipo,
      escopoId,
      resumo.tipoResumo,
      user,
      true,
    );
  }
}

@Injectable()
export class CancelSummaryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streamBus: AiStreamBus,
  ) {}

  async execute(escritorioId: string, id: string, user: AuthUser) {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    // Reafirma docs/api/14-ai.md §14.5 — só o autor da solicitação pode cancelar.
    if (resumo.solicitadoPorId !== user.membroId) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Apenas quem solicitou pode cancelar esta geração.'),
      );
    }
    if (resumo.status !== 'GERANDO' && resumo.status !== 'PENDENTE') {
      return Result.ok(undefined); // best-effort — já concluído, ignora silenciosamente (reafirma §14.5)
    }

    await this.prisma.client.resumoIA.update({
      where: { id },
      data: { status: 'FALHA', erro: 'Cancelado pelo usuário' },
    });
    this.streamBus.publish(id, {
      type: 'error',
      data: { code: 'CANCELLED', message: 'Cancelado pelo usuário' },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class SummaryFeedbackUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    id: string,
    input: { feedback: 'POSITIVO' | 'NEGATIVO'; comentarioFeedback?: string },
    user: AuthUser,
  ) {
    const resumo = await this.prisma.client.resumoIA.findFirst({ where: { id, escritorioId } });
    if (!resumo) return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    if (!(await assertResumoAccess(this.prisma, escritorioId, resumo, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Resumo não encontrado.'));
    }

    await this.prisma.client.resumoIA.update({
      where: { id },
      data: { feedback: input.feedback, comentarioFeedback: input.comentarioFeedback },
    });
    return Result.ok(undefined);
  }
}
