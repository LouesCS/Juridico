import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { AddCaseTeamMemberDto } from '../../presentation/schemas/legal-case.schemas';

async function assertProcessoExiste(
  prisma: PrismaService,
  escritorioId: string,
  processoId: string,
) {
  const processo = await prisma.client.processo.findFirst({
    where: { id: processoId, escritorioId },
    select: { id: true, responsavelPrincipalId: true },
  });
  return processo;
}

/** Reafirma docs/api/09-legal-cases.md §9.2 — Equipe (`ProcessoMembro`). */
@Injectable()
export class ListCaseTeamUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string): Promise<Result<unknown>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const equipe = await this.prisma.client.processoMembro.findMany({
      where: { processoId, saiuEm: null },
      orderBy: { entrouEm: 'asc' },
    });
    const membros = await this.prisma.client.membro.findMany({
      where: { id: { in: equipe.map((e) => e.membroId) } },
      include: { usuario: true },
    });
    const membroPorId = new Map(membros.map((m) => [m.id, m]));

    return Result.ok(
      equipe.map((e) => {
        const membro = membroPorId.get(e.membroId);
        return {
          id: e.id,
          membroId: e.membroId,
          nome: membro?.usuario?.nome ?? null,
          avatarUrl: membro?.usuario?.avatarUrl ?? null,
          funcaoNoProcesso: e.funcaoNoProcesso,
          responsavelPrincipal: e.responsavelPrincipal,
          acessoPermitido: e.acessoPermitido,
          entrouEm: e.entrouEm,
        };
      }),
    );
  }
}

@Injectable()
export class AddCaseTeamMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    processoId: string,
    dto: AddCaseTeamMemberDto,
    atorMembroId?: string,
  ): Promise<Result<{ id: string }>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: dto.membroId, escritorioId, status: 'ATIVO' },
      select: { id: true, usuario: { select: { nome: true } } },
    });
    if (!membro) return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado.'));

    const jaNaEquipe = await this.prisma.client.processoMembro.findFirst({
      where: { processoId, membroId: dto.membroId, saiuEm: null },
      select: { id: true },
    });
    if (jaNaEquipe) return Result.ok({ id: jaNaEquipe.id });

    const vinculo = await this.prisma.client.processoMembro.create({
      data: {
        processoId,
        membroId: dto.membroId,
        funcaoNoProcesso: dto.funcaoNoProcesso,
        acessoPermitido: dto.acessoPermitido,
      },
      select: { id: true },
    });

    await this.timeline.record({
      escritorioId,
      processoId,
      tipo: 'EQUIPE_ALTERADA',
      titulo: `${membro.usuario?.nome} adicionado à equipe`,
      autorId: atorMembroId,
      entidadeRelacionadaTipo: 'membro',
      entidadeRelacionadaId: dto.membroId,
    });

    return Result.ok(vinculo);
  }
}

/**
 * Reafirma docs/api/09-legal-cases.md §9.2 — mantém
 * `ProcessoMembro.responsavelPrincipal` sincronizado com
 * `Processo.responsavelPrincipalId` na mesma transação; adiciona o novo
 * responsável à equipe automaticamente se ele ainda não estiver nela.
 */
@Injectable()
export class ChangeCaseResponsibleUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    processoId: string,
    novoResponsavelId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: novoResponsavelId, escritorioId, status: 'ATIVO' },
      select: { id: true, usuario: { select: { nome: true } } },
    });
    if (!membro) return Result.fail(new DomainError('NOT_FOUND', 'Membro não encontrado.'));

    await this.prisma.client.$transaction(async (tx) => {
      await tx.processo.update({
        where: { id: processoId },
        data: { responsavelPrincipalId: novoResponsavelId },
      });

      await tx.processoMembro.updateMany({
        where: { processoId, responsavelPrincipal: true },
        data: { responsavelPrincipal: false },
      });

      const vinculoExistente = await tx.processoMembro.findFirst({
        where: { processoId, membroId: novoResponsavelId, saiuEm: null },
      });

      if (vinculoExistente) {
        await tx.processoMembro.update({
          where: { id: vinculoExistente.id },
          data: { responsavelPrincipal: true },
        });
      } else {
        await tx.processoMembro.create({
          data: {
            processoId,
            membroId: novoResponsavelId,
            responsavelPrincipal: true,
            acessoPermitido: 'LEITURA_ESCRITA',
          },
        });
      }
    });

    await this.timeline.record({
      escritorioId,
      processoId,
      tipo: 'ALTERACAO_RESPONSAVEL',
      titulo: `${membro.usuario?.nome} agora é o responsável principal`,
      autorId: atorMembroId,
      entidadeRelacionadaTipo: 'membro',
      entidadeRelacionadaId: novoResponsavelId,
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class RemoveCaseTeamMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    processoId: string,
    membroId: string,
    atorMembroId?: string,
  ): Promise<Result<void>> {
    const processo = await assertProcessoExiste(this.prisma, escritorioId, processoId);
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    if (processo.responsavelPrincipalId === membroId) {
      return Result.fail(
        new DomainError(
          'FORBIDDEN',
          'O responsável principal não pode ser removido da equipe — troque o responsável primeiro.',
        ),
      );
    }

    const vinculo = await this.prisma.client.processoMembro.findFirst({
      where: { processoId, membroId, saiuEm: null },
      select: { id: true },
    });
    if (!vinculo)
      return Result.fail(new DomainError('NOT_FOUND', 'Membro não está na equipe deste processo.'));

    await this.prisma.client.processoMembro.update({
      where: { id: vinculo.id },
      data: { saiuEm: new Date() },
    });

    await this.timeline.record({
      escritorioId,
      processoId,
      tipo: 'EQUIPE_ALTERADA',
      titulo: 'Membro removido da equipe',
      autorId: atorMembroId,
      entidadeRelacionadaTipo: 'membro',
      entidadeRelacionadaId: membroId,
    });

    return Result.ok(undefined);
  }
}
