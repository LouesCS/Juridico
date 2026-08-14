import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import {
  CreateTaskTemplateDto,
  UpdateTaskTemplateDto,
} from '../presentation/schemas/configuration.schemas';

/**
 * Catálogo-apenas: não existe módulo de Tarefas ainda (docs/backend-
 * implementation/00-status.md), mesmo padrão de `financeiro:*` no Prompt 12
 * — administrável aqui, sem ponto de consumo real nesta rodada.
 */
@Injectable()
export class ListTaskTemplatesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.modeloTarefa.findMany({
      where: { escritorioId },
      include: { categoria: { select: { id: true, nome: true, cor: true } } },
      orderBy: { nome: 'asc' },
    });
  }
}

@Injectable()
export class CreateTaskTemplateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateTaskTemplateDto): Promise<Result<{ id: string }>> {
    if (dto.categoriaId) {
      const categoria = await this.prisma.client.categoriaTarefa.findFirst({
        where: { id: dto.categoriaId, escritorioId },
        select: { id: true },
      });
      if (!categoria) {
        return Result.fail(new DomainError('NOT_FOUND', 'Categoria de tarefa não encontrada.'));
      }
    }
    const existente = await this.prisma.client.modeloTarefa.findFirst({
      where: { escritorioId, nome: dto.nome },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError('DUPLICATE_NAME', 'Já existe um modelo de tarefa com este nome.'),
      );
    }

    const modelo = await this.prisma.client.modeloTarefa.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(modelo);
  }
}

@Injectable()
export class UpdateTaskTemplateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    id: string,
    dto: UpdateTaskTemplateDto,
  ): Promise<Result<void>> {
    const modelo = await this.prisma.client.modeloTarefa.findFirst({ where: { id, escritorioId } });
    if (!modelo)
      return Result.fail(new DomainError('NOT_FOUND', 'Modelo de tarefa não encontrado.'));

    if (dto.categoriaId) {
      const categoria = await this.prisma.client.categoriaTarefa.findFirst({
        where: { id: dto.categoriaId, escritorioId },
        select: { id: true },
      });
      if (!categoria) {
        return Result.fail(new DomainError('NOT_FOUND', 'Categoria de tarefa não encontrada.'));
      }
    }

    await this.prisma.client.modeloTarefa.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteTaskTemplateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const modelo = await this.prisma.client.modeloTarefa.findFirst({ where: { id, escritorioId } });
    if (!modelo)
      return Result.fail(new DomainError('NOT_FOUND', 'Modelo de tarefa não encontrado.'));
    await this.prisma.client.modeloTarefa.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}
