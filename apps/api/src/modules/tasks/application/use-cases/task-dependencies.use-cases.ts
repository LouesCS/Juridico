import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { AddDependencyDto } from '../../presentation/schemas/task.schemas';

/**
 * "Dependências Múltiplas"/"Bloqueios" (Prompt 14). Rejeita auto-
 * dependência, duplicata e o ciclo direto mais simples (A depende de B e
 * B depende de A) — uma verificação completa de ciclos em grafo fica fora
 * do escopo desta rodada (nenhuma cadeia de dependências deste projeto
 * tem profundidade suficiente para justificar o custo agora).
 */
@Injectable()
export class AddDependencyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    dto: AddDependencyDto,
  ): Promise<Result<void>> {
    if (tarefaId === dto.dependeDeId) {
      return Result.fail(
        new DomainError('MALFORMED_REQUEST', 'Uma tarefa não pode depender de si mesma.'),
      );
    }

    const [tarefa, dependeDe] = await Promise.all([
      this.prisma.client.tarefa.findFirst({
        where: { id: tarefaId, escritorioId },
        select: { id: true },
      }),
      this.prisma.client.tarefa.findFirst({
        where: { id: dto.dependeDeId, escritorioId },
        select: { id: true },
      }),
    ]);
    if (!tarefa || !dependeDe)
      return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    const cicloDireto = await this.prisma.client.tarefaDependencia.findFirst({
      where: { tarefaId: dto.dependeDeId, dependeDeId: tarefaId },
      select: { id: true },
    });
    if (cicloDireto) {
      return Result.fail(
        new DomainError('MALFORMED_REQUEST', 'Isso criaria um ciclo de dependências.'),
      );
    }

    const existente = await this.prisma.client.tarefaDependencia.findFirst({
      where: { tarefaId, dependeDeId: dto.dependeDeId },
      select: { id: true },
    });
    if (existente) return Result.ok(undefined);

    await this.prisma.client.tarefaDependencia.create({
      data: { tarefaId, dependeDeId: dto.dependeDeId },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveDependencyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    tarefaId: string,
    dependeDeId: string,
  ): Promise<Result<void>> {
    const tarefa = await this.prisma.client.tarefa.findFirst({
      where: { id: tarefaId, escritorioId },
      select: { id: true },
    });
    if (!tarefa) return Result.fail(new DomainError('NOT_FOUND', 'Tarefa não encontrada.'));

    await this.prisma.client.tarefaDependencia.deleteMany({ where: { tarefaId, dependeDeId } });
    return Result.ok(undefined);
  }
}
