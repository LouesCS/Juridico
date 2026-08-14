import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { CreateTaskCommentDto } from '../../presentation/schemas/task.schemas';

/**
 * Escopo mínimo de Comentários para Tarefa (Prompt 14) — reaproveita o
 * modelo `Comentario` já existente desde a Fase 1 (nunca implementado até
 * agora, ver docs/backend-implementation/00-status.md), só create/list,
 * sem menções/edição/exclusão (pendência de módulo Comments completo já
 * registrada desde a Sprint 09).
 */
@Injectable()
export class ListTaskCommentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string) {
    return this.prisma.client.comentario.findMany({
      where: { tarefaId, escritorioId },
      orderBy: { criadoEm: 'asc' },
    });
  }
}

@Injectable()
export class CreateTaskCommentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    autorId: string,
    dto: CreateTaskCommentDto,
  ): Promise<Result<{ id: string }>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true, titulo: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const comentario = await this.prisma.client.comentario.create({
      data: { escritorioId, tarefaId, autorId, conteudo: dto.conteudo },
      select: { id: true },
    });

    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'COMENTARIO',
      titulo: `Comentário adicionado em "${tarefa.titulo}"`,
      autorId,
    });

    return Result.ok(comentario);
  }
}
