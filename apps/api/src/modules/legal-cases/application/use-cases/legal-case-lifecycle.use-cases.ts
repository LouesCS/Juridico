import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';

/** Reafirma docs/api/09-legal-cases.md §9.1 — soft delete sem cascata. */
@Injectable()
export class DeleteLegalCaseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string): Promise<Result<void>> {
    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    await this.prisma.client.processo.update({
      where: { id: processoId },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class ArchiveLegalCaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    processoId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      select: { id: true },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    await this.prisma.client.processo.update({
      where: { id: processoId },
      data: { status: 'ARQUIVADO', arquivadoEm: new Date() },
    });

    await this.timeline.record({
      escritorioId,
      processoId,
      tipo: 'ARQUIVAMENTO',
      titulo: 'Processo arquivado',
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class RestoreLegalCaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  /** Mesma limitação de `INCLUDE_DELETED` documentada em client-lifecycle.use-cases.ts. */
  async execute(
    escritorioId: string,
    processoId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const encontrados = await this.prisma.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM processos WHERE id = ${processoId}::uuid AND escritorio_id = ${escritorioId}::uuid
    `;
    if (encontrados.length === 0) {
      return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));
    }

    await this.prisma.client.$executeRaw`
      UPDATE processos SET excluido_em = NULL, status = 'ATIVO'
      WHERE id = ${processoId}::uuid AND escritorio_id = ${escritorioId}::uuid
    `;

    await this.timeline.record({
      escritorioId,
      processoId,
      tipo: 'RESTAURACAO',
      titulo: 'Processo restaurado',
      autorId: atorMembroId,
    });

    return Result.ok(undefined);
  }
}
