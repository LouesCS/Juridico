import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  CreateCasePartyDto,
  UpdateCasePartyDto,
} from '../../presentation/schemas/legal-case.schemas';

function assertProcessoExiste(prisma: PrismaService, escritorioId: string, processoId: string) {
  return prisma.client.processo.findFirst({
    where: { id: processoId, escritorioId },
    select: { id: true },
  });
}

/** Reafirma docs/api/09-legal-cases.md §9.3 — Participantes (`ParteProcesso`). */
@Injectable()
export class ListCasePartiesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string): Promise<Result<unknown>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const partes = await this.prisma.client.parteProcesso.findMany({
      where: { processoId, escritorioId, excluidoEm: null },
      orderBy: [{ principal: 'desc' }, { criadoEm: 'asc' }],
    });
    return Result.ok(partes);
  }
}

@Injectable()
export class AddCasePartyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    dto: CreateCasePartyDto,
  ): Promise<Result<{ id: string }>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    if (dto.clienteId) {
      const cliente = await this.prisma.client.cliente.findFirst({
        where: { id: dto.clienteId, escritorioId, excluidoEm: null },
        select: { id: true },
      });
      if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Pessoa não encontrada.'));
    }
    const duplicada = await this.prisma.client.parteProcesso.findFirst({
      where: {
        processoId,
        escritorioId,
        excluidoEm: null,
        ...(dto.clienteId ? { clienteId: dto.clienteId } : { nome: dto.nome, tipo: dto.tipo }),
      },
      select: { id: true, tipo: true },
    });
    if (duplicada)
      return Result.fail(
        new DomainError('DUPLICATE_PARTY', 'Esta pessoa já participa do processo.'),
      );

    const parte = await this.prisma.client.$transaction(async (tx) => {
      if (dto.principal) {
        await tx.parteProcesso.updateMany({
          where: { processoId, tipo: dto.tipo, principal: true, excluidoEm: null },
          data: { principal: false },
        });
      }
      return tx.parteProcesso.create({
        data: {
          escritorioId,
          processoId,
          tipo: dto.tipo,
          natureza: dto.natureza,
          nome: dto.nome,
          documento: dto.documento,
          clienteId: dto.clienteId,
          ehNossoCliente: Boolean(dto.clienteId),
          oabNumero: dto.oabNumero,
          oabUf: dto.oabUf,
          observacoes: dto.observacoes,
          principal: dto.principal,
        },
        select: { id: true },
      });
    });

    return Result.ok(parte);
  }
}

@Injectable()
export class UpdateCasePartyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    parteId: string,
    dto: UpdateCasePartyDto,
  ): Promise<Result<void>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const parte = await this.prisma.client.parteProcesso.findFirst({
      where: { id: parteId, processoId },
      select: { id: true, tipo: true },
    });
    if (!parte) return Result.fail(new DomainError('NOT_FOUND', 'Parte não encontrada.'));

    if (dto.clienteId) {
      const cliente = await this.prisma.client.cliente.findFirst({
        where: { id: dto.clienteId, escritorioId, excluidoEm: null },
        select: { id: true },
      });
      if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Pessoa não encontrada.'));
    }
    await this.prisma.client.$transaction(async (tx) => {
      if (dto.principal === true) {
        await tx.parteProcesso.updateMany({
          where: {
            processoId,
            tipo: dto.tipo ?? parte.tipo,
            principal: true,
            id: { not: parteId },
            excluidoEm: null,
          },
          data: { principal: false },
        });
      }
      await tx.parteProcesso.update({
        where: { id: parteId },
        data: {
          ...dto,
          ehNossoCliente: dto.clienteId !== undefined ? Boolean(dto.clienteId) : undefined,
        },
      });
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveCasePartyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string, parteId: string): Promise<Result<void>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const parte = await this.prisma.client.parteProcesso.findFirst({
      where: { id: parteId, processoId },
      select: { id: true },
    });
    if (!parte) return Result.fail(new DomainError('NOT_FOUND', 'Parte não encontrada.'));

    await this.prisma.client.parteProcesso.update({
      where: { id: parteId },
      data: { excluidoEm: new Date() },
    });

    return Result.ok(undefined);
  }
}
