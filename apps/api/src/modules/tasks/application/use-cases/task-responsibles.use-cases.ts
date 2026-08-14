import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AddResponsavelAuxiliarDto } from '../../presentation/schemas/task.schemas';

@Injectable()
export class AddResponsavelAuxiliarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    dto: AddResponsavelAuxiliarDto,
  ): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: dto.membroId, escritorioId },
      select: { id: true },
    });
    if (!membro)
      return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado neste escritório.'));

    const existente = await this.prisma.client.tarefaResponsavelAuxiliar.findFirst({
      where: { tarefaId, membroId: dto.membroId },
      select: { id: true },
    });
    if (!existente) {
      await this.prisma.client.tarefaResponsavelAuxiliar.create({
        data: { tarefaId, membroId: dto.membroId },
      });
    }
    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveResponsavelAuxiliarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string, membroId: string): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    await this.prisma.client.tarefaResponsavelAuxiliar.deleteMany({
      where: { tarefaId, membroId },
    });
    return Result.ok(undefined);
  }
}
