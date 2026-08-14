import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import {
  CreateValueSetDto,
  CreateValueSetItemDto,
  UpdateValueSetDto,
  UpdateValueSetItemDto,
} from '../presentation/schemas/configuration.schemas';

@Injectable()
export class ListValueSetsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.conjuntoValores.findMany({
      where: { escritorioId },
      include: { itens: { orderBy: { ordem: 'asc' } } },
      orderBy: { nome: 'asc' },
    });
  }
}

@Injectable()
export class GetValueSetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string) {
    const conjunto = await this.prisma.client.conjuntoValores.findFirst({
      where: { id, escritorioId },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (!conjunto)
      return Result.fail(new DomainError('NOT_FOUND', 'Conjunto de valores não encontrado.'));
    return Result.ok(conjunto);
  }
}

@Injectable()
export class CreateValueSetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateValueSetDto): Promise<Result<{ id: string }>> {
    const existente = await this.prisma.client.conjuntoValores.findFirst({
      where: { escritorioId, nome: dto.nome },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError('DUPLICATE_NAME', 'Já existe um conjunto de valores com este nome.'),
      );
    }
    const conjunto = await this.prisma.client.conjuntoValores.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(conjunto);
  }
}

@Injectable()
export class UpdateValueSetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, dto: UpdateValueSetDto): Promise<Result<void>> {
    const conjunto = await this.prisma.client.conjuntoValores.findFirst({
      where: { id, escritorioId },
    });
    if (!conjunto)
      return Result.fail(new DomainError('NOT_FOUND', 'Conjunto de valores não encontrado.'));
    await this.prisma.client.conjuntoValores.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteValueSetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const conjunto = await this.prisma.client.conjuntoValores.findFirst({
      where: { id, escritorioId },
    });
    if (!conjunto)
      return Result.fail(new DomainError('NOT_FOUND', 'Conjunto de valores não encontrado.'));
    await this.prisma.client.conjuntoValores.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class AddValueSetItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    conjuntoId: string,
    dto: CreateValueSetItemDto,
  ): Promise<Result<{ id: string }>> {
    const conjunto = await this.prisma.client.conjuntoValores.findFirst({
      where: { id: conjuntoId, escritorioId },
      select: { id: true },
    });
    if (!conjunto)
      return Result.fail(new DomainError('NOT_FOUND', 'Conjunto de valores não encontrado.'));

    const item = await this.prisma.client.conjuntoValorItem.create({
      data: { conjuntoId, ...dto },
      select: { id: true },
    });
    return Result.ok(item);
  }
}

@Injectable()
export class UpdateValueSetItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    conjuntoId: string,
    itemId: string,
    dto: UpdateValueSetItemDto,
  ): Promise<Result<void>> {
    const item = await this.prisma.client.conjuntoValorItem.findFirst({
      where: { id: itemId, conjuntoId, conjunto: { escritorioId } },
      select: { id: true },
    });
    if (!item) return Result.fail(new DomainError('NOT_FOUND', 'Item não encontrado.'));
    await this.prisma.client.conjuntoValorItem.update({ where: { id: itemId }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveValueSetItemUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, conjuntoId: string, itemId: string): Promise<Result<void>> {
    const item = await this.prisma.client.conjuntoValorItem.findFirst({
      where: { id: itemId, conjuntoId, conjunto: { escritorioId } },
      select: { id: true },
    });
    if (!item) return Result.fail(new DomainError('NOT_FOUND', 'Item não encontrado.'));
    await this.prisma.client.conjuntoValorItem.delete({ where: { id: itemId } });
    return Result.ok(undefined);
  }
}
