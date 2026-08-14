import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

@Injectable()
export class DeleteTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, tarefaId: string): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    await this.prisma.client.tarefa.update({
      where: { id: tarefaId },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}
