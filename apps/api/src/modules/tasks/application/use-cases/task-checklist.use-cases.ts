import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  AddChecklistItemDto,
  UpdateChecklistItemDto,
} from '../../presentation/schemas/task.schemas';

async function findTarefa(prisma: PrismaService, escritorioId: string, tarefaId: string) {
  return prisma.client.tarefa.findFirst({
    where: { id: tarefaId, escritorioId },
    select: { id: true },
  });
}

@Injectable()
export class AddChecklistItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    dto: AddChecklistItemDto,
  ): Promise<Result<{ id: string }>> {
    const tarefa = await findTarefa(this.prisma, escritorioId, tarefaId);
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const item = await this.prisma.client.tarefaChecklistItem.create({
      data: { tarefaId, titulo: dto.titulo, obrigatorio: dto.obrigatorio, ordem: dto.ordem },
      select: { id: true },
    });
    return Result.ok(item);
  }
}

@Injectable()
export class UpdateChecklistItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    itemId: string,
    membroId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<Result<void>> {
    const item = await this.prisma.client.tarefaChecklistItem.findFirst({
      where: { id: itemId, tarefaId, tarefa: { escritorioId } },
    });
    if (!item)
      return Result.fail(new DomainError('NOT_FOUND', 'Item de checklist não encontrado.'));

    const { concluido, ...rest } = dto;
    await this.prisma.client.tarefaChecklistItem.update({
      where: { id: itemId },
      data: {
        ...rest,
        ...(concluido === undefined
          ? {}
          : concluido
            ? { concluidoEm: new Date(), concluidoPorId: membroId }
            : { concluidoEm: null, concluidoPorId: null }),
      },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveChecklistItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string, itemId: string): Promise<Result<void>> {
    const item = await this.prisma.client.tarefaChecklistItem.findFirst({
      where: { id: itemId, tarefaId, tarefa: { escritorioId } },
      select: { id: true },
    });
    if (!item)
      return Result.fail(new DomainError('NOT_FOUND', 'Item de checklist não encontrado.'));

    await this.prisma.client.tarefaChecklistItem.delete({ where: { id: itemId } });
    return Result.ok(undefined);
  }
}
