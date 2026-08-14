import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { isValidCnj, normalizeCnj } from '../../domain/cnj';
import { UpdateLegalCaseDto } from '../../presentation/schemas/legal-case.schemas';

/**
 * Reafirma docs/api/09-legal-cases.md §9.1 (`PATCH /v1/legal-cases/:id`) —
 * versionamento otimista via `If-Match`: `versaoEsperada` precisa bater com
 * `Processo.versao` atual, senão `STALE_VERSION` (409) sem aplicar nada.
 * Reafirma Sprint 08: toda alteração relevante (status, prioridade,
 * segredo de justiça) gera um evento automático na Timeline via
 * `TimelineRecorderService` — nunca uma escrita direta em `EventoTimeline`.
 */
@Injectable()
export class UpdateLegalCaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    processoId: string,
    versaoEsperada: number,
    dto: UpdateLegalCaseDto,
    atorMembroId?: string,
  ): Promise<Result<{ versao: number }>> {
    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: {
        id: true,
        versao: true,
        numeroCnj: true,
        status: true,
        prioridade: true,
        segredoJustica: true,
        dataDistribuicao: true,
        dataEncerramento: true,
      },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    if (processo.versao !== versaoEsperada) {
      return Result.fail(
        new DomainError('STALE_VERSION', 'Este processo foi atualizado por outra pessoa.', {
          versaoAtual: processo.versao,
        }),
      );
    }

    const entrada = dto.dataDistribuicao
      ? new Date(`${dto.dataDistribuicao}T00:00:00.000Z`)
      : processo.dataDistribuicao;
    const conclusao = dto.dataEncerramento
      ? new Date(`${dto.dataEncerramento}T00:00:00.000Z`)
      : dto.dataEncerramento === null
        ? null
        : processo.dataEncerramento;
    if (entrada && conclusao && conclusao < entrada) {
      return Result.fail(
        new DomainError(
          'INVALID_DATE_RANGE',
          'A data de conclusão não pode ser anterior à data de entrada.',
        ),
      );
    }

    let numeroCnj: string | undefined;
    if (dto.numeroCnj !== undefined) {
      if (!isValidCnj(dto.numeroCnj)) {
        return Result.fail(
          new DomainError('INVALID_CHECK_DIGIT', 'Número CNJ com dígito verificador inválido.'),
        );
      }
      numeroCnj = normalizeCnj(dto.numeroCnj);
      if (numeroCnj !== processo.numeroCnj) {
        const duplicado = await this.prisma.client.processo.findFirst({
          where: { escritorioId, numeroCnj, id: { not: processoId } },
          select: { id: true },
        });
        if (duplicado) {
          return Result.fail(
            new DomainError('DUPLICATE_CNJ', 'Já existe um processo com este número.', {
              processoExistenteId: duplicado.id,
            }),
          );
        }
      }
    }

    const atualizado = await this.prisma.client.processo.update({
      where: { id: processoId },
      data: {
        ...dto,
        numeroCnj,
        valorCausaCentavos:
          dto.valorCausaCentavos !== undefined ? BigInt(dto.valorCausaCentavos) : undefined,
        dataDistribuicao: dto.dataDistribuicao ? new Date(dto.dataDistribuicao) : undefined,
        dataEncerramento:
          dto.dataEncerramento === null
            ? null
            : dto.dataEncerramento
              ? new Date(`${dto.dataEncerramento}T00:00:00.000Z`)
              : undefined,
        versao: { increment: 1 },
        ultimaAtualizacaoEm: new Date(),
      },
      select: { versao: true },
    });

    await this.recordTimelineEvents(escritorioId, processoId, processo, dto, atorMembroId);

    return Result.ok({ versao: atualizado.versao });
  }

  private async recordTimelineEvents(
    escritorioId: string,
    processoId: string,
    antes: { status: string; prioridade: string; segredoJustica: boolean },
    dto: UpdateLegalCaseDto,
    atorMembroId?: string,
  ): Promise<void> {
    if (dto.status !== undefined && dto.status !== antes.status) {
      await this.timeline.record({
        escritorioId,
        processoId,
        tipo: 'ALTERACAO_STATUS',
        titulo: `Status alterado de ${antes.status} para ${dto.status}`,
        autorId: atorMembroId,
        metadados: { de: antes.status, para: dto.status },
      });
    }
    if (dto.prioridade !== undefined && dto.prioridade !== antes.prioridade) {
      await this.timeline.record({
        escritorioId,
        processoId,
        tipo: 'ALTERACAO_PRIORIDADE',
        titulo: `Prioridade alterada de ${antes.prioridade} para ${dto.prioridade}`,
        autorId: atorMembroId,
        metadados: { de: antes.prioridade, para: dto.prioridade },
      });
    }
    if (dto.segredoJustica !== undefined && dto.segredoJustica !== antes.segredoJustica) {
      await this.timeline.record({
        escritorioId,
        processoId,
        tipo: 'SEGREDO_JUSTICA_ALTERADO',
        titulo: dto.segredoJustica
          ? 'Processo marcado como segredo de justiça'
          : 'Segredo de justiça removido',
        autorId: atorMembroId,
      });
    }
    const camposGerais = Object.keys(dto).filter(
      (k) => !['status', 'prioridade', 'segredoJustica'].includes(k),
    );
    if (camposGerais.length > 0) {
      await this.timeline.record({
        escritorioId,
        processoId,
        tipo: 'ATUALIZACAO_PROCESSO',
        titulo: 'Processo atualizado',
        autorId: atorMembroId,
        metadados: { campos: camposGerais },
      });
    }
  }
}
