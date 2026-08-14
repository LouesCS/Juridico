import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import {
  CreateExtraFieldDto,
  ListByEntidadeQuery,
  UpdateExtraFieldDto,
} from '../presentation/schemas/configuration.schemas';

@Injectable()
export class ListExtraFieldsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, query: ListByEntidadeQuery) {
    return this.prisma.client.campoExtra.findMany({
      where: { escritorioId, entidade: query.entidade },
      orderBy: [{ entidade: 'asc' }, { ordem: 'asc' }],
    });
  }
}

@Injectable()
export class CreateExtraFieldUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateExtraFieldDto): Promise<Result<{ id: string }>> {
    const existente = await this.prisma.client.campoExtra.findFirst({
      where: { escritorioId, entidade: dto.entidade, chave: dto.chave },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError(
          'DUPLICATE_NAME',
          'Já existe um campo extra com esta chave para esta entidade.',
        ),
      );
    }

    const campo = await this.prisma.client.campoExtra.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(campo);
  }
}

@Injectable()
export class UpdateExtraFieldUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, dto: UpdateExtraFieldDto): Promise<Result<void>> {
    const campo = await this.prisma.client.campoExtra.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    });
    if (!campo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Campo extra não encontrado.'));
    }
    await this.prisma.client.campoExtra.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteExtraFieldUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const campo = await this.prisma.client.campoExtra.findFirst({
      where: { id, escritorioId },
      select: { id: true },
    });
    if (!campo) {
      return Result.fail(new DomainError('NOT_FOUND', 'Campo extra não encontrado.'));
    }
    await this.prisma.client.campoExtra.update({ where: { id }, data: { excluidoEm: new Date() } });
    return Result.ok(undefined);
  }
}
