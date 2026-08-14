import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../shared/domain/result';
import {
  AddGroupMemberDto,
  CreateCollaboratorGroupDto,
  UpdateCollaboratorGroupDto,
} from '../presentation/schemas/configuration.schemas';

@Injectable()
export class ListCollaboratorGroupsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const grupos = await this.prisma.client.grupoColaboradores.findMany({
      where: { escritorioId },
      // `membro.nome` já é a fonte canônica de identidade desde o módulo
      // Colaboradores (preenchida independentemente de haver `Usuario`
      // vinculado) — não precisa mais incluir `usuario` só para exibir nome.
      include: { membros: { include: { membro: { select: { id: true, nome: true } } } } },
      orderBy: { nome: 'asc' },
    });
    return grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      descricao: g.descricao,
      ativo: g.ativo,
      membros: g.membros.map((m) => ({ id: m.membro.id, nome: m.membro.nome })),
    }));
  }
}

@Injectable()
export class CreateCollaboratorGroupUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    dto: CreateCollaboratorGroupDto,
  ): Promise<Result<{ id: string }>> {
    const existente = await this.prisma.client.grupoColaboradores.findFirst({
      where: { escritorioId, nome: dto.nome },
      select: { id: true },
    });
    if (existente) {
      return Result.fail(
        new DomainError('DUPLICATE_NAME', 'Já existe um grupo de colaboradores com este nome.'),
      );
    }
    const grupo = await this.prisma.client.grupoColaboradores.create({
      data: { escritorioId, ...dto },
      select: { id: true },
    });
    return Result.ok(grupo);
  }
}

@Injectable()
export class UpdateCollaboratorGroupUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    id: string,
    dto: UpdateCollaboratorGroupDto,
  ): Promise<Result<void>> {
    const grupo = await this.prisma.client.grupoColaboradores.findFirst({
      where: { id, escritorioId },
    });
    if (!grupo)
      return Result.fail(new DomainError('NOT_FOUND', 'Grupo de colaboradores não encontrado.'));
    await this.prisma.client.grupoColaboradores.update({ where: { id }, data: dto });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteCollaboratorGroupUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<void>> {
    const grupo = await this.prisma.client.grupoColaboradores.findFirst({
      where: { id, escritorioId },
    });
    if (!grupo)
      return Result.fail(new DomainError('NOT_FOUND', 'Grupo de colaboradores não encontrado.'));
    await this.prisma.client.grupoColaboradores.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class AddCollaboratorGroupMemberUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    grupoId: string,
    dto: AddGroupMemberDto,
  ): Promise<Result<void>> {
    const grupo = await this.prisma.client.grupoColaboradores.findFirst({
      where: { id: grupoId, escritorioId },
      select: { id: true },
    });
    if (!grupo)
      return Result.fail(new DomainError('NOT_FOUND', 'Grupo de colaboradores não encontrado.'));

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: dto.membroId, escritorioId },
      select: { id: true },
    });
    if (!membro)
      return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado neste escritório.'));

    const jaMembro = await this.prisma.client.grupoColaboradorMembro.findFirst({
      where: { grupoId, membroId: dto.membroId },
      select: { id: true },
    });
    if (!jaMembro) {
      await this.prisma.client.grupoColaboradorMembro.create({
        data: { grupoId, membroId: dto.membroId },
      });
    }
    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveCollaboratorGroupMemberUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, grupoId: string, membroId: string): Promise<Result<void>> {
    const grupo = await this.prisma.client.grupoColaboradores.findFirst({
      where: { id: grupoId, escritorioId },
      select: { id: true },
    });
    if (!grupo)
      return Result.fail(new DomainError('NOT_FOUND', 'Grupo de colaboradores não encontrado.'));

    await this.prisma.client.grupoColaboradorMembro.deleteMany({ where: { grupoId, membroId } });
    return Result.ok(undefined);
  }
}
