import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { CreateTaskDto } from '../../presentation/schemas/task.schemas';
import { TaskValueSetsService } from '../task-value-sets.service';
import { validateTaskReferences } from '../task-validation';
import { RECURSOS_VALIDAVEIS } from './task-links.use-cases';

/**
 * Reafirma docs/backend-implementation/23-task-engine.md §23.3. `statusId`/
 * `prioridadeId` caem no primeiro item do Conjunto de Valores
 * auto-provisionado quando não informados — toda tarefa nasce com um
 * status/prioridade visível, nunca `null` por omissão do formulário.
 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valueSets: TaskValueSetsService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    criadoPorId: string,
    dto: CreateTaskDto,
  ): Promise<Result<{ id: string }>> {
    const erroValidacao = await validateTaskReferences(this.prisma, escritorioId, dto);
    if (erroValidacao) return Result.fail(erroValidacao);
    const vinculos = Array.from(
      new Map(dto.vinculos.map((item) => [`${item.tipoRecurso}:${item.recursoId}`, item])).values(),
    );
    for (const vinculo of vinculos) {
      const validator = RECURSOS_VALIDAVEIS[vinculo.tipoRecurso];
      if (validator && !(await validator(this.prisma, escritorioId, vinculo.recursoId)))
        return Result.fail(new DomainError('NOT_FOUND', 'Recurso vinculado não encontrado.'));
    }

    if (dto.dependeDeIds.length > 0) {
      const dependencias = await this.prisma.client.tarefa.findMany({
        where: { id: { in: dto.dependeDeIds }, escritorioId },
        select: { id: true },
      });
      if (dependencias.length !== new Set(dto.dependeDeIds).size) {
        return Result.fail(
          new DomainError('NOT_FOUND', 'Uma ou mais dependências não existem neste escritório.'),
        );
      }
    }

    const [statusPadrao, prioridadePadrao] = await Promise.all([
      dto.statusId ? null : this.valueSets.ensureStatusValueSet(escritorioId),
      dto.prioridadeId ? null : this.valueSets.ensurePrioridadeValueSet(escritorioId),
    ]);

    const statusId = dto.statusId ?? statusPadrao?.itens[0]?.id;
    const prioridadeId = dto.prioridadeId ?? prioridadePadrao?.itens[0]?.id;

    let recorrenciaId: string | undefined;
    if (dto.recorrencia) {
      const recorrencia = await this.prisma.client.tarefaRecorrencia.create({
        data: {
          escritorioId,
          frequencia: dto.recorrencia.frequencia,
          intervalo: dto.recorrencia.intervalo,
          diasSemana: dto.recorrencia.diasSemana,
          respeitarDiasUteis: dto.recorrencia.respeitarDiasUteis,
          dataFim: dto.recorrencia.dataFim
            ? new Date(`${dto.recorrencia.dataFim}T00:00:00.000Z`)
            : undefined,
        },
        select: { id: true },
      });
      recorrenciaId = recorrencia.id;
    }

    const tarefa = await this.prisma.client.tarefa.create({
      data: {
        escritorioId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        categoriaId: dto.categoriaId,
        statusId,
        prioridadeId,
        responsavelPrincipalId: dto.responsavelPrincipalId,
        equipeId: dto.equipeId,
        grupoColaboradoresId: dto.grupoColaboradoresId,
        dataInicio: dto.dataInicio ? new Date(`${dto.dataInicio}T00:00:00.000Z`) : undefined,
        dataVencimento: dto.dataVencimento
          ? new Date(`${dto.dataVencimento}T00:00:00.000Z`)
          : undefined,
        recorrenciaId,
        criadoPorId,
        responsaveisAuxiliares: {
          create: dto.responsaveisAuxiliaresIds.map((membroId) => ({ membroId })),
        },
        checklist: {
          create: dto.checklist.map((item) => ({
            titulo: item.titulo,
            obrigatorio: item.obrigatorio,
            ordem: item.ordem,
          })),
        },
        vinculos: {
          create: vinculos.map((v) => ({ tipoRecurso: v.tipoRecurso, recursoId: v.recursoId })),
        },
        ...(dto.dependeDeIds.length > 0
          ? { dependencias: { create: dto.dependeDeIds.map((dependeDeId) => ({ dependeDeId })) } }
          : {}),
      },
      select: { id: true },
    });

    await this.timeline.record({
      escritorioId,
      tarefaId: tarefa.id,
      tipo: 'CRIACAO_TAREFA',
      titulo: `Tarefa "${dto.titulo}" criada`,
      autorId: criadoPorId,
    });

    return Result.ok(tarefa);
  }
}
