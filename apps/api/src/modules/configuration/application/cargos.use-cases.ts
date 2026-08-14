import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import { CreateCargoDto, UpdateCargoDto } from '../presentation/schemas/configuration.schemas';

/**
 * Catálogo de Cargos (módulo Colaboradores) — clone estrutural de
 * `collaborator-groups.use-cases.ts` (mesmo padrão de
 * CRUD/soft-delete/unicidade por escritório do Configuration Engine),
 * acrescido de `ordem`. Não tem endpoints de "membros do cargo" — diferente
 * de `GrupoColaboradores` (join table `GrupoColaboradorMembro`), `Cargo` é
 * uma FK direta em `Membro.cargoId` (um colaborador tem no máximo um cargo).
 */
@Injectable()
export class ListCargosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const cargos = await this.prisma.client.cargo.findMany({
      where: { escritorioId },
      orderBy: { ordem: 'asc' },
    });
    return cargos.map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      ativo: c.ativo,
      ordem: c.ordem,
    }));
  }
}

@Injectable()
export class CreateCargoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateCargoDto): Promise<Result<{ id: string }>> {
    const existente = await this.prisma.client.cargo.findFirst({
      where: { escritorioId, nome: dto.nome },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(new DomainError('DUPLICATE_NAME', 'Já existe um cargo com este nome.'));
    }
    const cargo = await this.prisma.client.cargo.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(cargo);
  }
}

@Injectable()
export class UpdateCargoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string, dto: UpdateCargoDto): Promise<Result<void>> {
    const cargo = await this.prisma.client.cargo.findFirst({ where: { id, escritorioId } });
    if (!cargo) return Result.fail(new DomainError('NOT_FOUND', 'Cargo não encontrado.'));
    await this.prisma.client.cargo.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteCargoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const cargo = await this.prisma.client.cargo.findFirst({ where: { id, escritorioId } });
    if (!cargo) return Result.fail(new DomainError('NOT_FOUND', 'Cargo não encontrado.'));
    await this.prisma.client.cargo.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}
