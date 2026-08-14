import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { CancelTaskDto, MoveTaskDto } from '../../presentation/schemas/task.schemas';
import { computeNextOccurrence } from '../task-recurrence';
import { TaskValueSetsService } from '../task-value-sets.service';

@Injectable()
export class ArchiveTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(escritorioId: string, tarefaId: string, atorId: string): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: { arquivadaEm: new Date() },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'ARQUIVAMENTO',
      titulo: `Tarefa "${tarefa.titulo}" arquivada`,
      autorId: atorId,
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class RestoreTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(escritorioId: string, tarefaId: string, atorId: string): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: { arquivadaEm: null, excluidoEm: null },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'RESTAURACAO',
      titulo: `Tarefa "${tarefa.titulo}" restaurada`,
      autorId: atorId,
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DuplicateTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    atorId: string,
  ): Promise<Result<{ id: string }>> {
    const original = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      include: { checklist: true, vinculos: true },
    });
    if (!original) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const copia = await this.prisma.client.tarefa.create({
      data: {
        escritorioId,
        titulo: `${original.titulo} (cópia)`,
        descricao: original.descricao,
        categoriaId: original.categoriaId,
        statusId: original.statusId,
        prioridadeId: original.prioridadeId,
        responsavelPrincipalId: original.responsavelPrincipalId,
        equipeId: original.equipeId,
        grupoColaboradoresId: original.grupoColaboradoresId,
        dataInicio: original.dataInicio,
        dataVencimento: original.dataVencimento,
        criadoPorId: atorId,
        checklist: {
          create: original.checklist.map((item) => ({
            titulo: item.titulo,
            obrigatorio: item.obrigatorio,
            ordem: item.ordem,
          })),
        },
        vinculos: {
          create: original.vinculos.map((v) => ({
            tipoRecurso: v.tipoRecurso,
            recursoId: v.recursoId,
          })),
        },
      },
      select: { id: true },
    });

    return Result.ok(copia);
  }
}

@Injectable()
export class MoveTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    atorId: string,
    dto: MoveTaskDto,
  ): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    if (dto.statusId) {
      const item = await this.prisma.client.conjuntoValorItem.findFirst({
        where: { id: dto.statusId, conjunto: { escritorioId } },
        select: { id: true, valor: true },
      });
      if (!item)
        return Result.fail(new DomainError('NOT_FOUND', 'Status não encontrado neste escritório.'));
    }

    const statusIds = [tarefa.statusId, dto.statusId].filter((id): id is string => !!id);
    const statusItems = statusIds.length
      ? await this.prisma.client.conjuntoValorItem.findMany({ where: { id: { in: statusIds } } })
      : [];
    const statusById = new Map(statusItems.map((item) => [item.id, item.valor]));
    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: { statusId: dto.statusId },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'ALTERACAO_STATUS',
      titulo: `Status alterado de "${statusById.get(tarefa.statusId ?? '') ?? 'A Fazer'}" para "${statusById.get(dto.statusId ?? '') ?? 'A Fazer'}".`,
      autorId: atorId,
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class ReopenTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
    private readonly valueSets?: TaskValueSetsService,
  ) {}

  async execute(escritorioId: string, tarefaId: string, atorId: string): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));
    if (!tarefa.concluidaEm && !tarefa.canceladaEm) {
      return Result.fail(
        new DomainError('MALFORMED_REQUEST', 'Tarefa não está concluída nem cancelada.'),
      );
    }

    const statusId = await this.valueSets?.getKanbanStatusId(escritorioId, 'Fazendo');
    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: {
        concluidaEm: null,
        canceladaEm: null,
        motivoCancelamento: null,
        ...(statusId ? { statusId } : {}),
      },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'ALTERACAO_STATUS',
      titulo: `Tarefa "${tarefa.titulo}" reaberta`,
      autorId: atorId,
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class CancelTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
    private readonly valueSets?: TaskValueSetsService,
  ) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    atorId: string,
    dto: CancelTaskDto,
  ): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const statusId = await this.valueSets?.getKanbanStatusId(escritorioId, 'Cancelados');
    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: {
        canceladaEm: new Date(),
        motivoCancelamento: dto.motivo ?? tarefa.motivoCancelamento,
        ...(statusId ? { concluidaEm: null, statusId } : {}),
      },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'CANCELAMENTO_TAREFA',
      titulo: `Tarefa "${tarefa.titulo}" cancelada`,
      descricao: dto.motivo ?? tarefa.motivoCancelamento ?? undefined,
      autorId: atorId,
    });
    return Result.ok(undefined);
  }
}

/**
 * "Bloqueios" (Prompt 14 §Dependências): não é possível concluir uma
 * tarefa enquanto suas dependências não estiverem concluídas, nem
 * enquanto houver item de checklist **obrigatório** pendente. Se a tarefa
 * tiver uma recorrência, a próxima instância é gerada de forma síncrona
 * (sem fila — ver `task-recurrence.ts`).
 */
@Injectable()
export class CompleteTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
    private readonly valueSets?: TaskValueSetsService,
  ) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    atorId: string,
  ): Promise<Result<{ proximaOcorrenciaId: string | null }>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      include: {
        checklist: true,
        dependencias: { include: { dependeDe: true } },
        recorrencia: true,
      },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const dependenciasPendentes = tarefa.dependencias.filter((d) => !d.dependeDe.concluidaEm);
    if (dependenciasPendentes.length > 0) {
      return Result.fail(
        new DomainError(
          'TASK_DEPENDENCIES_PENDING',
          'Existem dependências não concluídas bloqueando esta tarefa.',
        ),
      );
    }

    const checklistObrigatorioPendente = tarefa.checklist.some(
      (item) => item.obrigatorio && !item.concluidoEm,
    );
    if (checklistObrigatorioPendente) {
      return Result.fail(
        new DomainError(
          'TASK_CHECKLIST_PENDING',
          'Existem itens de checklist obrigatórios não concluídos.',
        ),
      );
    }

    const statusId = await this.valueSets?.getKanbanStatusId(escritorioId, 'Concluídos');
    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: { concluidaEm: new Date(), ...(statusId ? { canceladaEm: null, statusId } : {}) },
    });
    await this.timeline.record({
      escritorioId,
      tarefaId,
      tipo: 'CONCLUSAO_TAREFA',
      titulo: `Tarefa "${tarefa.titulo}" concluída`,
      autorId: atorId,
    });

    let proximaOcorrenciaId: string | null = null;
    if (tarefa.recorrencia && tarefa.dataVencimento) {
      const feriados = await this.prisma.client.feriado.findMany({
        where: { escritorioId },
        select: { data: true },
      });
      const holidayDates = new Set(feriados.map((f) => f.data.toISOString().slice(0, 10)));
      const proximaData = computeNextOccurrence(
        tarefa.dataVencimento,
        {
          frequencia: tarefa.recorrencia.frequencia,
          intervalo: tarefa.recorrencia.intervalo,
          diasSemana: tarefa.recorrencia.diasSemana,
          respeitarDiasUteis: tarefa.recorrencia.respeitarDiasUteis,
          dataFim: tarefa.recorrencia.dataFim,
        },
        holidayDates,
      );

      if (proximaData) {
        const proxima = await this.prisma.client.tarefa.create({
          data: {
            escritorioId,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            categoriaId: tarefa.categoriaId,
            statusId: tarefa.statusId,
            prioridadeId: tarefa.prioridadeId,
            responsavelPrincipalId: tarefa.responsavelPrincipalId,
            equipeId: tarefa.equipeId,
            grupoColaboradoresId: tarefa.grupoColaboradoresId,
            dataVencimento: proximaData,
            recorrenciaId: tarefa.recorrenciaId,
            tarefaOrigemId: tarefa.id,
            criadoPorId: tarefa.criadoPorId,
          },
          select: { id: true },
        });
        proximaOcorrenciaId = proxima.id;
        await this.timeline.record({
          escritorioId,
          tarefaId: proxima.id,
          tipo: 'CRIACAO_TAREFA',
          titulo: `Tarefa recorrente "${tarefa.titulo}" gerada`,
          autorId: atorId,
          origem: 'SISTEMA',
        });
      }
    }

    return Result.ok({ proximaOcorrenciaId });
  }
}
