import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  CancelCaseDeadlineDto,
  CreateCaseDeadlineDto,
  UpdateCaseDeadlineDto,
} from '../../presentation/schemas/legal-case.schemas';

function assertProcessoExiste(prisma: PrismaService, escritorioId: string, processoId: string) {
  return prisma.client.processo.findFirst({
    where: { id: processoId, escritorioId },
    select: { id: true },
  });
}

/** Reafirma docs/api/09-legal-cases.md §9.4 — Prazos (`Prazo`) de um processo. */
@Injectable()
export class ListCaseDeadlinesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string): Promise<Result<unknown>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const prazos = await this.prisma.client.prazo.findMany({
      where: { processoId },
      orderBy: { dataVencimento: 'asc' },
    });
    return Result.ok(prazos);
  }
}

@Injectable()
export class CreateCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    dto: CreateCaseDeadlineDto,
  ): Promise<Result<{ id: string }>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const responsavel = await this.prisma.client.membro.findFirst({
      where: { id: dto.responsavelId, escritorioId, status: 'ATIVO' },
      select: { id: true },
    });
    if (!responsavel)
      return Result.fail(new DomainError('NOT_FOUND', 'Responsável não encontrado.'));

    const prazo = await this.prisma.client.prazo.create({
      data: {
        escritorioId,
        processoId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        tipo: dto.tipo,
        dataVencimento: new Date(dto.dataVencimento),
        horaVencimento: dto.horaVencimento
          ? new Date(`1970-01-01T${dto.horaVencimento}:00Z`)
          : undefined,
        responsavelId: dto.responsavelId,
        prioridade: dto.prioridade,
      },
      select: { id: true },
    });

    return Result.ok(prazo);
  }
}

@Injectable()
export class UpdateCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    prazoId: string,
    dto: UpdateCaseDeadlineDto,
  ): Promise<Result<void>> {
    const prazo = await this.prisma.client.prazo.findFirst({
      where: { id: prazoId, processoId, escritorioId },
      select: { id: true },
    });
    if (!prazo) return Result.fail(new DomainError('NOT_FOUND', 'Prazo não encontrado.'));

    await this.prisma.client.prazo.update({
      where: { id: prazoId },
      data: {
        ...dto,
        dataVencimento: dto.dataVencimento ? new Date(dto.dataVencimento) : undefined,
        horaVencimento: dto.horaVencimento
          ? new Date(`1970-01-01T${dto.horaVencimento}:00Z`)
          : undefined,
        dataConclusao: dto.status === 'CONCLUIDO' ? new Date() : undefined,
      },
    });

    return Result.ok(undefined);
  }
}

/**
 * Reafirma docs/api/09-legal-cases.md §9.4 (regra 23 de
 * docs/database/12-eventos-fluxos-regras.md §12.4) — cancelar prazo `FATAL`
 * exige justificativa.
 */
@Injectable()
export class CancelCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    prazoId: string,
    dto: CancelCaseDeadlineDto,
  ): Promise<Result<void>> {
    const prazo = await this.prisma.client.prazo.findFirst({
      where: { id: prazoId, processoId, escritorioId },
      select: { id: true, tipo: true },
    });
    if (!prazo) return Result.fail(new DomainError('NOT_FOUND', 'Prazo não encontrado.'));

    if (prazo.tipo === 'FATAL' && !dto.motivoCancelamento) {
      return Result.fail(
        new DomainError('JUSTIFICATION_REQUIRED', 'Cancelar um prazo fatal exige justificativa.'),
      );
    }

    await this.prisma.client.prazo.update({
      where: { id: prazoId },
      data: { status: 'CANCELADO', motivoCancelamento: dto.motivoCancelamento },
    });

    return Result.ok(undefined);
  }
}

/**
 * Reafirma Sprint 08 ("Concluir" prazo) — "Prazo concluído" aparece na
 * Timeline via projeção de `Prazo` (ver `list-case-timeline.use-case.ts`),
 * não por escrita explícita em `EventoTimeline`, então este use case não
 * injeta `TimelineRecorderService`.
 */
@Injectable()
export class CompleteCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string, prazoId: string): Promise<Result<void>> {
    const prazo = await this.prisma.client.prazo.findFirst({
      where: { id: prazoId, processoId, escritorioId },
      select: { id: true },
    });
    if (!prazo) return Result.fail(new DomainError('NOT_FOUND', 'Prazo não encontrado.'));

    await this.prisma.client.prazo.update({
      where: { id: prazoId },
      data: { status: 'CONCLUIDO', dataConclusao: new Date() },
    });

    return Result.ok(undefined);
  }
}

/** Reafirma Sprint 08 ("Reabrir" prazo) — volta um prazo concluído/cancelado para `PENDENTE`. */
@Injectable()
export class ReopenCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string, prazoId: string): Promise<Result<void>> {
    const prazo = await this.prisma.client.prazo.findFirst({
      where: { id: prazoId, processoId, escritorioId },
      select: { id: true },
    });
    if (!prazo) return Result.fail(new DomainError('NOT_FOUND', 'Prazo não encontrado.'));

    await this.prisma.client.prazo.update({
      where: { id: prazoId },
      data: { status: 'PENDENTE', dataConclusao: null, motivoCancelamento: null },
    });

    return Result.ok(undefined);
  }
}

/** Reafirma Sprint 08 ("Duplicar" prazo) — cria uma cópia pendente no mesmo processo. */
@Injectable()
export class DuplicateCaseDeadlineUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    processoId: string,
    prazoId: string,
  ): Promise<Result<{ id: string }>> {
    const original = await this.prisma.client.prazo.findFirst({
      where: { id: prazoId, processoId, escritorioId },
    });
    if (!original) return Result.fail(new DomainError('NOT_FOUND', 'Prazo não encontrado.'));

    const copia = await this.prisma.client.prazo.create({
      data: {
        escritorioId,
        processoId,
        titulo: `${original.titulo} (cópia)`,
        descricao: original.descricao,
        tipo: original.tipo,
        dataVencimento: original.dataVencimento,
        horaVencimento: original.horaVencimento,
        responsavelId: original.responsavelId,
        prioridade: original.prioridade,
      },
      select: { id: true },
    });

    return Result.ok(copia);
  }
}
