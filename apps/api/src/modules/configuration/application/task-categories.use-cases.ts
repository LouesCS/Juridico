import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import {
  CreateTaskCategoryDto,
  UpdateTaskCategoryDto,
} from '../presentation/schemas/configuration.schemas';

@Injectable()
export class ListTaskCategoriesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.categoriaTarefa.findMany({
      where: { escritorioId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }
}

@Injectable()
export class CreateTaskCategoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateTaskCategoryDto): Promise<Result<{ id: string }>> {
    const existente = await this.prisma.client.categoriaTarefa.findFirst({
      where: { escritorioId, nome: dto.nome },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError('DUPLICATE_NAME', 'Já existe uma categoria de tarefa com este nome.'),
      );
    }
    const categoria = await this.prisma.client.categoriaTarefa.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(categoria);
  }
}

@Injectable()
export class UpdateTaskCategoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    id: string,
    dto: UpdateTaskCategoryDto,
  ): Promise<Result<void>> {
    const categoria = await this.prisma.client.categoriaTarefa.findFirst({
      where: { id, escritorioId },
    });
    if (!categoria)
      return Result.fail(new DomainError('NOT_FOUND', 'Categoria de tarefa não encontrada.'));
    await this.prisma.client.categoriaTarefa.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteTaskCategoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const categoria = await this.prisma.client.categoriaTarefa.findFirst({
      where: { id, escritorioId },
    });
    if (!categoria)
      return Result.fail(new DomainError('NOT_FOUND', 'Categoria de tarefa não encontrada.'));
    // Exclusão nunca é bloqueada por Modelos de Tarefa vinculados — soft
    // delete apenas some da listagem; o vínculo do modelo permanece
    // (mesmo comportamento tolerante de referência que `FOLDER_NOT_EMPTY`
    // evita ser aqui: um Modelo de Tarefa não é "conteúdo" que impeça a
    // exclusão da categoria, diferente de uma Pasta com documentos).
    await this.prisma.client.categoriaTarefa.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}
