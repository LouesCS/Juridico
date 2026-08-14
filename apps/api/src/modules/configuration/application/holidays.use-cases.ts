import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import { CreateHolidayDto, UpdateHolidayDto } from '../presentation/schemas/configuration.schemas';

/**
 * Catálogo pronto para o futuro cálculo de "dias úteis" em Prazos — não
 * conectado ao módulo Deadlines nesta rodada (alteraria o contrato dele,
 * proibido explicitamente pelo Prompt 13).
 */
@Injectable()
export class ListHolidaysUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.feriado.findMany({
      where: { escritorioId },
      orderBy: { data: 'asc' },
    });
  }
}

@Injectable()
export class CreateHolidayUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateHolidayDto): Promise<Result<{ id: string }>> {
    const data = new Date(`${dto.data}T00:00:00.000Z`);
    const existente = await this.prisma.client.feriado.findFirst({
      where: { escritorioId, nome: dto.nome, data },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError('DUPLICATE_NAME', 'Já existe um feriado com este nome nesta data.'),
      );
    }

    const feriado = await this.prisma.client.feriado.create({
      data: { escritorioId, ...dto, data },
      select: { id: true },
    });
    return Result.ok(feriado);
  }
}

@Injectable()
export class UpdateHolidayUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, dto: UpdateHolidayDto): Promise<Result<void>> {
    const feriado = await this.prisma.client.feriado.findFirst({ where: { id, escritorioId } });
    if (!feriado) return Result.fail(new DomainError('NOT_FOUND', 'Feriado não encontrado.'));

    const { data, ...rest } = dto;
    await this.prisma.client.feriado.update({
      where: { id },
      data: { ...rest, data: data ? new Date(`${data}T00:00:00.000Z`) : undefined },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteHolidayUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const feriado = await this.prisma.client.feriado.findFirst({ where: { id, escritorioId } });
    if (!feriado) return Result.fail(new DomainError('NOT_FOUND', 'Feriado não encontrado.'));
    await this.prisma.client.feriado.update({ where: { id }, data: { excluidoEm: new Date() } });
    return Result.ok(undefined);
  }
}
