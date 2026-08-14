import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/** Mesmo padrão de `DocumentoFavorito` (Sprint 09) — `TarefaFavorito`, nunca duplicado. */
@Injectable()
export class ToggleTaskFavoriteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    membroId: string,
  ): Promise<Result<{ favorita: boolean }>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const existente = await this.prisma.client.tarefaFavorito.findFirst({
      where: { tarefaId, membroId },
    });
    if (existente) {
      await this.prisma.client.tarefaFavorito.delete({
        where: { tarefaId_membroId: { tarefaId, membroId } },
      });
      return Result.ok({ favorita: false });
    }

    await this.prisma.client.tarefaFavorito.create({ data: { tarefaId, membroId } });
    return Result.ok({ favorita: true });
  }
}
