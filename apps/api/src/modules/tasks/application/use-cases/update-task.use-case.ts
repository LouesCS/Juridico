import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { UpdateTaskDto } from '../../presentation/schemas/task.schemas';
import { validateTaskReferences } from '../task-validation';

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.3. Mudança de
 * responsável/status/prioridade registra evento de Timeline automático
 * (reaproveita `ALTERACAO_RESPONSAVEL`/`ALTERACAO_STATUS`/
 * `ALTERACAO_PRIORIDADE`, já genéricos desde a Sprint 08/11, nunca um
 * valor de enum novo).
 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    atorId: string,
    dto: UpdateTaskDto,
  ): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const erroValidacao = await validateTaskReferences(this.prisma, escritorioId, dto);
    if (erroValidacao) return Result.fail(erroValidacao);

    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        categoriaId: dto.categoriaId,
        statusId: dto.statusId,
        prioridadeId: dto.prioridadeId,
        responsavelPrincipalId: dto.responsavelPrincipalId,
        equipeId: dto.equipeId,
        grupoColaboradoresId: dto.grupoColaboradoresId,
        dataInicio:
          dto.dataInicio === undefined
            ? undefined
            : dto.dataInicio
              ? new Date(`${dto.dataInicio}T00:00:00.000Z`)
              : null,
        dataVencimento:
          dto.dataVencimento === undefined
            ? undefined
            : dto.dataVencimento
              ? new Date(`${dto.dataVencimento}T00:00:00.000Z`)
              : null,
      },
    });

    if (
      dto.responsavelPrincipalId !== undefined &&
      dto.responsavelPrincipalId !== tarefa.responsavelPrincipalId
    ) {
      await this.timeline.record({
        escritorioId,
        tarefaId,
        tipo: 'ALTERACAO_RESPONSAVEL',
        titulo: 'Responsável da tarefa alterado',
        autorId: atorId,
      });
    }
    if (dto.statusId !== undefined && dto.statusId !== tarefa.statusId) {
      await this.timeline.record({
        escritorioId,
        tarefaId,
        tipo: 'ALTERACAO_STATUS',
        titulo: 'Status da tarefa alterado',
        autorId: atorId,
      });
    }
    if (dto.prioridadeId !== undefined && dto.prioridadeId !== tarefa.prioridadeId) {
      await this.timeline.record({
        escritorioId,
        tarefaId,
        tipo: 'ALTERACAO_PRIORIDADE',
        titulo: 'Prioridade da tarefa alterada',
        autorId: atorId,
      });
    }

    return Result.ok(undefined);
  }
}
