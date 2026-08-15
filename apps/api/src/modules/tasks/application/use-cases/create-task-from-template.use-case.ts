import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { CreateTaskFromTemplateDto } from '../../presentation/schemas/task.schemas';
import { TaskValueSetsService } from '../task-value-sets.service';
import { RECURSOS_VALIDAVEIS } from './task-links.use-cases';

const PRIORIDADE_LABEL: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

/**
 * "Criar tarefa a partir do modelo" (Prompt 14 §Modelos) — consome
 * `ModeloTarefa` (Configuration Engine, Prompt 13) sem duplicar nada: só
 * copia campos para uma `Tarefa` nova. `prioridadePadrao`/categoria do
 * modelo são resolvidos contra os Conjuntos de Valores já auto-
 * provisionados do Task Engine (nunca um enum próprio).
 */
@Injectable()
export class CreateTaskFromTemplateUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valueSets: TaskValueSetsService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    criadoPorId: string,
    dto: CreateTaskFromTemplateDto,
  ): Promise<Result<{ id: string }>> {
    const modelo = await this.prisma.client.modeloTarefa.findFirst({
      where: { id: dto.modeloId, escritorioId, ativo: true },
    });
    if (!modelo)
      return Result.fail(new DomainError('NOT_FOUND', 'Modelo de tarefa não encontrado.'));
    const vinculos = dto.vinculos ?? [];
    for (const vinculo of vinculos) {
      const validator = RECURSOS_VALIDAVEIS[vinculo.tipoRecurso];
      if (validator && !(await validator(this.prisma, escritorioId, vinculo.recursoId)))
        return Result.fail(new DomainError('NOT_FOUND', 'Recurso vinculado não encontrado.'));
    }

    const [statusPadrao, prioridadePadrao] = await Promise.all([
      this.valueSets.ensureStatusValueSet(escritorioId),
      this.valueSets.ensurePrioridadeValueSet(escritorioId),
    ]);

    const labelDesejado = PRIORIDADE_LABEL[modelo.prioridadePadrao] ?? modelo.prioridadePadrao;
    const prioridadeItem =
      prioridadePadrao.itens.find((i) => i.valor.toLowerCase() === labelDesejado.toLowerCase()) ??
      prioridadePadrao.itens[0];

    const dataVencimento = dto.dataVencimento
      ? new Date(`${dto.dataVencimento}T00:00:00.000Z`)
      : modelo.prazoDiasPadrao > 0
        ? new Date(Date.now() + modelo.prazoDiasPadrao * 24 * 60 * 60 * 1000)
        : undefined;

    const tarefa = await this.prisma.client.tarefa.create({
      data: {
        escritorioId,
        titulo: modelo.nome,
        descricao: modelo.descricao,
        categoriaId: modelo.categoriaId,
        statusId: statusPadrao.itens[0]?.id,
        prioridadeId: prioridadeItem?.id,
        responsavelPrincipalId: dto.responsavelPrincipalId,
        modeloOrigemId: modelo.id,
        dataVencimento,
        criadoPorId,
        checklist: {
          create: modelo.checklist.map((titulo, ordem) => ({ titulo, obrigatorio: false, ordem })),
        },
        vinculos: { create: vinculos },
      },
      select: { id: true },
    });

    await this.timeline.record({
      escritorioId,
      tarefaId: tarefa.id,
      tipo: 'CRIACAO_TAREFA',
      titulo: `Tarefa "${modelo.nome}" criada a partir do modelo`,
      autorId: criadoPorId,
    });

    return Result.ok(tarefa);
  }
}
