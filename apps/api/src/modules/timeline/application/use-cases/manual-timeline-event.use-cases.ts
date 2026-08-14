import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  CreateManualTimelineEventDto,
  UpdateManualTimelineEventDto,
} from '../../presentation/schemas/timeline.schemas';

/** Reafirma docs/api/11-timeline.md §11.2 — só `ANOTACAO`/`PERSONALIZADO` manuais. */
@Injectable()
export class CreateManualTimelineEventUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    autorId: string,
    dto: CreateManualTimelineEventDto,
  ): Promise<Result<{ id: string }>> {
    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const evento = await this.prisma.client.eventoTimeline.create({
      data: {
        escritorioId,
        processoId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        descricao: dto.descricao,
        dataEvento: dto.dataEvento ? new Date(dto.dataEvento) : new Date(),
        origem: 'MANUAL',
        autorId,
      },
      select: { id: true },
    });

    return Result.ok(evento);
  }
}

/** Reafirma docs/api/11-timeline.md §11 — editar (fixar/desafixar) uma anotação manual. */
@Injectable()
export class UpdateManualTimelineEventUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    eventoId: string,
    ator: { membroId: string; podeEditarQualquer: boolean },
    dto: UpdateManualTimelineEventDto,
  ): Promise<Result<void>> {
    const evento = await this.prisma.client.eventoTimeline.findFirst({
      where: { id: eventoId, processoId, escritorioId },
    });
    if (!evento) return Result.fail(new DomainError('NOT_FOUND', 'Evento não encontrado.'));

    if (evento.origem !== 'MANUAL') {
      return Result.fail(
        new DomainError(
          'SYSTEM_EVENT_NOT_DELETABLE',
          'Eventos gerados pelo sistema não podem ser editados.',
        ),
      );
    }
    if (evento.autorId !== ator.membroId && !ator.podeEditarQualquer) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Você só pode editar suas próprias anotações.'),
      );
    }

    await this.prisma.client.eventoTimeline.update({
      where: { id: eventoId },
      data: dto,
    });

    return Result.ok(undefined);
  }
}

/** Reafirma docs/api/11-timeline.md §11.3 — soft delete, só eventos manuais. */
@Injectable()
export class DeleteManualTimelineEventUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    eventoId: string,
    ator: { membroId: string; podeEditarQualquer: boolean },
  ): Promise<Result<void>> {
    const evento = await this.prisma.client.eventoTimeline.findFirst({
      where: { id: eventoId, processoId, escritorioId },
    });
    if (!evento) return Result.fail(new DomainError('NOT_FOUND', 'Evento não encontrado.'));

    if (evento.origem !== 'MANUAL') {
      return Result.fail(
        new DomainError(
          'SYSTEM_EVENT_NOT_DELETABLE',
          'Eventos gerados pelo sistema não podem ser excluídos.',
        ),
      );
    }
    if (evento.autorId !== ator.membroId && !ator.podeEditarQualquer) {
      return Result.fail(
        new DomainError('FORBIDDEN', 'Você só pode excluir suas próprias anotações.'),
      );
    }

    await this.prisma.client.eventoTimeline.update({
      where: { id: eventoId },
      data: { excluidoEm: new Date() },
    });

    return Result.ok(undefined);
  }
}
